"use client"

import { useState } from "react"
import { Loader2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatCOP, formatDateShort } from "@/lib/format"
import { PAYMENT_METHODS } from "@/lib/constants"
import type { PartnerWithdrawal } from "@/lib/types"

type WithdrawalExpanded = PartnerWithdrawal & {
  partner?: { name: string }
}

interface DeleteWithdrawalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  withdrawal: WithdrawalExpanded | null
  onCompleted: () => void
}

export function DeleteWithdrawalDialog({
  open,
  onOpenChange,
  withdrawal,
  onCompleted,
}: DeleteWithdrawalDialogProps) {
  const supabase = createClient()
  const [deleting, setDeleting] = useState(false)

  if (!withdrawal) return null

  const methodLabel = PAYMENT_METHODS.find((m) => m.value === withdrawal.method)?.label || withdrawal.method

  const handleDelete = async () => {
    setDeleting(true)

    try {
      // 1. Buscar movimiento de caja asociado para revertir balance
      const { data: movements } = await supabase
        .from("cash_bank_movements")
        .select("id, account_id, amount")
        .eq("reference_type", "partner_withdrawal")
        .eq("reference_id", withdrawal.partner_id)
        .eq("amount", withdrawal.amount)
        .order("created_at", { ascending: false })
        .limit(1)

      if (movements && movements.length > 0) {
        const mov = movements[0]

        // Leer balance actual de la cuenta
        const { data: account } = await supabase
          .from("cash_bank_accounts")
          .select("balance")
          .eq("id", mov.account_id)
          .single()

        if (account) {
          // Revertir: sumar el monto de vuelta (era un egreso)
          await supabase
            .from("cash_bank_accounts")
            .update({ balance: account.balance + mov.amount })
            .eq("id", mov.account_id)
        }

        // Eliminar el movimiento de caja
        await supabase
          .from("cash_bank_movements")
          .delete()
          .eq("id", mov.id)
      }

      // 2. Eliminar el retiro
      const { error } = await supabase
        .from("partner_withdrawals")
        .delete()
        .eq("id", withdrawal.id)

      if (error) throw error

      toast.success("Retiro eliminado", {
        description: `${formatCOP(withdrawal.amount)} devuelto a ${withdrawal.partner?.name || "socio"}`,
      })

      onOpenChange(false)
      onCompleted()
    } catch {
      toast.error("Error al eliminar el retiro")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] text-xl">
            Eliminar retiro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-error-bg border border-error/20 rounded-lg p-4">
            <AlertTriangle size={20} className="text-error shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-error mb-1">Esta accion no se puede deshacer</p>
              <p className="text-muted-foreground">
                Se eliminara el retiro y se revertira el movimiento de caja asociado.
              </p>
            </div>
          </div>

          <div className="bg-cream rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Socio</span>
              <span className="font-medium">{withdrawal.partner?.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monto</span>
              <span className="font-semibold text-error tabular-nums">
                -{formatCOP(withdrawal.amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha</span>
              <span>{formatDateShort(withdrawal.withdrawal_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Metodo</span>
              <span>{methodLabel}</span>
            </div>
            {withdrawal.notes && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Notas</span>
                <span className="text-right max-w-[200px] truncate">{withdrawal.notes}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting && <Loader2 size={16} className="mr-1.5 animate-spin" />}
            Eliminar retiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
