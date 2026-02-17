"use client"

import { useState } from "react"
import { Loader2, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface VariantInfo {
  id: string
  product?: { name: string } | null
  color: string
  color_hex: string
  size: string
  cut: string
  stock: number
}

interface AdjustStockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: VariantInfo
  onCompleted: () => void
}

export function AdjustStockDialog({
  open,
  onOpenChange,
  variant,
  onCompleted,
}: AdjustStockDialogProps) {
  const [realStock, setRealStock] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { user } = useAuth()

  const real = parseInt(realStock)
  const diff = !isNaN(real) ? real - variant.stock : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (realStock === "" || isNaN(real) || real < 0) {
      toast.error("Ingresa el stock real (número positivo o cero)")
      return
    }

    if (!reason.trim()) {
      toast.error("Describe la razón del ajuste")
      return
    }

    if (diff === 0) {
      toast.info("El stock real es igual al del sistema, no se necesita ajuste")
      onOpenChange(false)
      return
    }

    setLoading(true)

    try {
      // Actualizar stock
      const { error: stockError } = await supabase
        .from("product_variants")
        .update({ stock: real })
        .eq("id", variant.id)

      if (stockError) throw stockError

      // Registrar movimiento de ajuste
      const { error: movError } = await supabase
        .from("inventory_movements")
        .insert({
          product_variant_id: variant.id,
          movement_type: "adjustment",
          quantity: diff,
          previous_stock: variant.stock,
          new_stock: real,
          reference_type: "stock_adjustment",
          notes: reason,
          created_by: user?.id,
        })

      if (movError) throw movError

      toast.success("Stock ajustado", {
        description: `${variant.product?.name} ${variant.color} ${variant.size}: ${variant.stock} → ${real} (${diff > 0 ? "+" : ""}${diff})`,
      })

      setRealStock("")
      setReason("")
      onOpenChange(false)
      onCompleted()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error al ajustar stock", { description: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Ajuste de inventario</DialogTitle>
          <DialogDescription>
            {variant.product?.name} — {variant.color} {variant.size} ({variant.cut})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Comparación visual */}
          <div className="flex items-center justify-center gap-4 py-4 bg-muted rounded-xl">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Sistema
              </p>
              <p className="text-2xl font-bold tabular-nums">{variant.stock}</p>
            </div>
            <ArrowRight size={20} className="text-muted-foreground" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Real
              </p>
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  realStock && !isNaN(real) ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {realStock && !isNaN(real) ? real : "—"}
              </p>
            </div>
            {realStock && !isNaN(real) && diff !== 0 && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Diferencia
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold tabular-nums",
                    diff > 0 ? "text-success" : "text-error"
                  )}
                >
                  {diff > 0 ? "+" : ""}
                  {diff}
                </p>
              </div>
            )}
          </div>

          {/* Stock real */}
          <div className="space-y-1.5">
            <Label htmlFor="real-stock">Stock real (conteo físico)</Label>
            <Input
              id="real-stock"
              type="number"
              min="0"
              placeholder="Cantidad real en bodega"
              value={realStock}
              onChange={(e) => setRealStock(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Razón */}
          <div className="space-y-1.5">
            <Label htmlFor="reason">Razón del ajuste</Label>
            <Textarea
              id="reason"
              placeholder="Ej: Conteo físico encontró diferencia..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              disabled={loading}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || diff === 0}
            >
              {loading && <Loader2 size={16} className="animate-spin mr-1.5" />}
              Aplicar ajuste
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
