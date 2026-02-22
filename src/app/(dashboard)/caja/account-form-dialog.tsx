"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CashBankAccount, AccountType } from "@/lib/types"

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "bank", label: "Banco" },
  { value: "digital", label: "Digital" },
]

interface AccountFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: CashBankAccount | null
  onCompleted: () => void
}

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
  onCompleted,
}: AccountFormDialogProps) {
  const isEditing = !!account
  const supabase = createClient()
  const { user } = useAuth()

  const [name, setName] = useState("")
  const [type, setType] = useState<AccountType>("cash")
  const [initialBalance, setInitialBalance] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (account) {
      setName(account.name)
      setType(account.type)
      setInitialBalance("")
      setIsActive(account.is_active)
    } else {
      setName("")
      setType("cash")
      setInitialBalance("")
      setIsActive(true)
    }
  }, [account, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("El nombre de la cuenta es requerido")
      return
    }

    setLoading(true)

    try {
      if (isEditing && account) {
        const { error } = await supabase
          .from("cash_bank_accounts")
          .update({
            name: name.trim(),
            type,
            is_active: isActive,
          })
          .eq("id", account.id)

        if (error) throw error
        toast.success("Cuenta actualizada")
      } else {
        const balance = initialBalance ? parseFloat(initialBalance) : 0

        const { data: newAccount, error } = await supabase
          .from("cash_bank_accounts")
          .insert({
            name: name.trim(),
            type,
            balance: Math.max(0, balance),
            is_active: true,
          })
          .select()
          .single()

        if (error) throw error

        // Si hay balance inicial, crear movimiento
        if (balance > 0 && newAccount) {
          await supabase.from("cash_bank_movements").insert({
            account_id: newAccount.id,
            movement_type: "in",
            amount: balance,
            previous_balance: 0,
            new_balance: balance,
            concept: "Saldo inicial",
            created_by: user?.id,
          })
        }

        toast.success("Cuenta creada", { description: name.trim() })
      }

      onOpenChange(false)
      onCompleted()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error al guardar cuenta", { description: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar cuenta" : "Nueva cuenta"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Nombre *</Label>
            <Input
              id="acc-name"
              placeholder="Ej: Cuenta de ahorros"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <Label>Tipo de cuenta</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Balance inicial (solo crear) */}
          {!isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="acc-balance">Balance inicial (COP)</Label>
              <Input
                id="acc-balance"
                type="number"
                min="0"
                placeholder="0"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {/* Balance actual (solo editar, readonly) */}
          {isEditing && account && (
            <div className="space-y-1.5">
              <Label>Balance actual</Label>
              <Input
                value={`$ ${account.balance.toLocaleString("es-CO")}`}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          {/* Estado activo (solo editar) */}
          {isEditing && (
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="acc-active">Cuenta activa</Label>
              <Switch
                id="acc-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin mr-1.5" />}
              {isEditing ? "Guardar cambios" : "Crear cuenta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
