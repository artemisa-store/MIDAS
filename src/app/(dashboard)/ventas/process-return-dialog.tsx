"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { RotateCcw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { formatCOP } from "@/lib/format"
import type { SaleExpanded } from "../facturacion/recibo-termico"

interface ProcessReturnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale: SaleExpanded | null
  onReturnProcessed: () => void
}

interface ReturnItem {
  itemId: string
  variantId: string
  productName: string
  variantDetails: string
  maxQty: number
  returnQty: number
  unitPrice: number
  selected: boolean
}

type ReturnReason = "defecto" | "no_gusto" | "talla_incorrecta" | "otro"

const RETURN_REASONS: { value: ReturnReason; label: string }[] = [
  { value: "defecto", label: "Producto defectuoso" },
  { value: "no_gusto", label: "No le gust\u00F3" },
  { value: "talla_incorrecta", label: "Talla incorrecta" },
  { value: "otro", label: "Otro motivo" },
]

export function ProcessReturnDialog({
  open,
  onOpenChange,
  sale,
  onReturnProcessed,
}: ProcessReturnDialogProps) {
  const { user } = useAuth()
  const supabase = createClient()

  const [returnItems, setReturnItems] = useState<ReturnItem[]>([])
  const [returnReason, setReturnReason] = useState<ReturnReason>("no_gusto")
  const [notes, setNotes] = useState("")
  const [restoreInventory, setRestoreInventory] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Inicializar items al abrir
  useEffect(() => {
    if (open && sale?.items) {
      setReturnItems(
        sale.items.map((item) => ({
          itemId: item.id,
          variantId: item.product_variant_id,
          productName: item.variant?.product?.name || "Producto",
          variantDetails: [item.variant?.color, item.variant?.size, item.variant?.cut]
            .filter(Boolean)
            .join(" \u00B7 "),
          maxQty: item.quantity,
          returnQty: item.quantity,
          unitPrice: item.unit_price,
          selected: true,
        }))
      )
      setReturnReason("no_gusto")
      setNotes("")
      setRestoreInventory(true)
    }
  }, [open, sale])

  // Calcular reembolso automático
  const calculatedRefund = useMemo(() => {
    return returnItems
      .filter((item) => item.selected)
      .reduce((sum, item) => sum + item.returnQty * item.unitPrice, 0)
  }, [returnItems])

  const updateItem = useCallback((index: number, updates: Partial<ReturnItem>) => {
    setReturnItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    )
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!sale || !user) return

    const selectedItems = returnItems.filter((i) => i.selected && i.returnQty > 0)
    if (selectedItems.length === 0) {
      toast.error("Selecciona al menos un producto para devolver")
      return
    }

    setSubmitting(true)

    try {
      const reasonLabel = RETURN_REASONS.find((r) => r.value === returnReason)?.label || returnReason
      const returnNote = `Devoluci\u00F3n: ${reasonLabel}${notes.trim() ? ` - ${notes.trim()}` : ""}`

      // 1. Actualizar estado de la venta
      await supabase
        .from("sales")
        .update({
          status: "returned",
          notes: sale.notes ? `${sale.notes}\n---\n${returnNote}` : returnNote,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sale.id)

      // 2. Restaurar inventario si está activado
      if (restoreInventory) {
        for (const item of selectedItems) {
          const { data: variantData } = await supabase
            .from("product_variants")
            .select("stock")
            .eq("id", item.variantId)
            .single()

          if (variantData) {
            const previousStock = variantData.stock
            const newStock = previousStock + item.returnQty

            await supabase
              .from("product_variants")
              .update({ stock: newStock })
              .eq("id", item.variantId)

            await supabase.from("inventory_movements").insert({
              product_variant_id: item.variantId,
              movement_type: "return",
              quantity: item.returnQty,
              previous_stock: previousStock,
              new_stock: newStock,
              reference_type: "sale_return",
              reference_id: sale.id,
              notes: `Devoluci\u00F3n ${sale.invoice_number} - ${reasonLabel}`,
              created_by: user.id,
            })
          }
        }
      }

      // 3. Si era crédito, cerrar cuenta por cobrar
      if (sale.is_credit) {
        await supabase
          .from("accounts_receivable")
          .update({
            status: "paid",
            remaining_amount: 0,
            notes: "Cerrado por devoluci\u00F3n",
          })
          .eq("sale_id", sale.id)
      }

      toast.success(`Devoluci\u00F3n procesada para ${sale.invoice_number}`)
      onOpenChange(false)
      onReturnProcessed()
    } catch {
      toast.error("Error al procesar la devoluci\u00F3n")
    } finally {
      setSubmitting(false)
    }
  }, [sale, user, returnItems, returnReason, notes, restoreInventory, supabase, onOpenChange, onReturnProcessed])

  if (!sale) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw size={20} className="text-error" />
            <span className="font-[family-name:var(--font-display)] text-xl">
              Devoluci\u00F3n — {sale.invoice_number}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Items a devolver */}
          <div>
            <Label className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
              Productos a devolver
            </Label>
            <div className="space-y-2 mt-2">
              {returnItems.map((item, index) => (
                <div
                  key={item.itemId}
                  className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${
                    item.selected ? "bg-cream" : "bg-muted/30 opacity-60"
                  }`}
                >
                  <Checkbox
                    checked={item.selected}
                    onCheckedChange={(checked) =>
                      updateItem(index, { selected: !!checked })
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{item.variantDetails}</p>
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min={1}
                      max={item.maxQty}
                      value={item.returnQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1
                        updateItem(index, {
                          returnQty: Math.max(1, Math.min(val, item.maxQty)),
                        })
                      }}
                      disabled={!item.selected}
                      className="h-8 text-sm text-center"
                    />
                  </div>
                  <span className="text-sm tabular-nums text-muted-foreground w-24 text-right">
                    {formatCOP(item.returnQty * item.unitPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Motivo */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1">Motivo de devoluci\u00F3n</Label>
            <Select value={returnReason} onValueChange={(v) => setReturnReason(v as ReturnReason)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETURN_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notas */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1">Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles adicionales..."
              className="min-h-[60px]"
            />
          </div>

          {/* Monto reembolso */}
          <div className="bg-cream rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Monto a devolver</Label>
              <span className="font-[family-name:var(--font-display)] text-xl font-bold text-error tabular-nums">
                {formatCOP(calculatedRefund)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Calculado autom\u00E1ticamente seg\u00FAn los productos seleccionados.
            </p>
          </div>

          {/* Restaurar inventario */}
          <div className="flex items-center gap-3 bg-cream rounded-lg p-3">
            <Checkbox
              checked={restoreInventory}
              onCheckedChange={(c) => setRestoreInventory(!!c)}
            />
            <div>
              <p className="text-sm font-semibold">Restaurar inventario</p>
              <p className="text-xs text-muted-foreground">
                Devuelve las unidades al stock de cada variante
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 size={16} className="mr-1.5 animate-spin" />}
            Confirmar devoluci\u00F3n
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
