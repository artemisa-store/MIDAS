"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
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
import { StatusBadge } from "@/components/shared/status-badge"
import { SALE_STATUS_CONFIG } from "@/lib/constants"
import type { SaleStatus } from "@/lib/types"
import type { SaleExpanded } from "../facturacion/recibo-termico"

interface ChangeStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale: SaleExpanded | null
  onStatusChanged: () => void
}

const VALID_TRANSITIONS: Record<SaleStatus, SaleStatus[]> = {
  paid: ["shipped"],
  pending: [],
  shipped: ["delivered"],
  delivered: [],
  returned: [],
}

export function ChangeStatusDialog({
  open,
  onOpenChange,
  sale,
  onStatusChanged,
}: ChangeStatusDialogProps) {
  const supabase = createClient()

  const [newStatus, setNewStatus] = useState<string>("")
  const [shippingAddress, setShippingAddress] = useState("")
  const [trackingNotes, setTrackingNotes] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Reset on open
  useEffect(() => {
    if (open && sale) {
      setNewStatus("")
      setShippingAddress(sale.shipping_address || sale.client?.address || "")
      setTrackingNotes("")
      setNotes("")
    }
  }, [open, sale])

  if (!sale) return null

  const validTransitions = VALID_TRANSITIONS[sale.status as SaleStatus] || []
  const isTerminal = validTransitions.length === 0

  const handleSubmit = async () => {
    if (!newStatus) return
    setSubmitting(true)

    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      if (newStatus === "shipped") {
        if (shippingAddress.trim()) {
          updateData.shipping_address = shippingAddress.trim()
        }
        if (trackingNotes.trim()) {
          updateData.notes = sale.notes
            ? `${sale.notes}\n---\nEnvío: ${trackingNotes.trim()}`
            : `Envío: ${trackingNotes.trim()}`
        }
      }

      if (notes.trim() && newStatus !== "shipped") {
        updateData.notes = sale.notes
          ? `${sale.notes}\n---\n${notes.trim()}`
          : notes.trim()
      }

      const { error } = await supabase
        .from("sales")
        .update(updateData)
        .eq("id", sale.id)

      if (error) {
        toast.error("Error al actualizar el estado")
        return
      }

      const statusLabel = SALE_STATUS_CONFIG[newStatus as SaleStatus]?.label || newStatus
      toast.success(`${sale.invoice_number} marcada como "${statusLabel}"`)
      onOpenChange(false)
      onStatusChanged()
    } catch {
      toast.error("Error inesperado")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] text-xl">
            Cambiar estado — {sale.invoice_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Estado actual */}
          <div className="flex items-center gap-3 bg-cream rounded-lg p-3">
            <span className="text-sm text-muted-foreground">Estado actual:</span>
            <StatusBadge status={sale.status} />
          </div>

          {isTerminal ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Esta venta ya se encuentra en un estado final y no puede cambiar.
            </div>
          ) : (
            <>
              {/* Nuevo estado */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1">Nuevo estado</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {validTransitions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {SALE_STATUS_CONFIG[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campos de envío */}
              {newStatus === "shipped" && (
                <div className="space-y-3 bg-cream rounded-lg p-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">
                      Dirección de envío
                    </Label>
                    <Input
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Dirección de entrega..."
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">
                      Guía / Notas de envío
                    </Label>
                    <Input
                      value={trackingNotes}
                      onChange={(e) => setTrackingNotes(e.target.value)}
                      placeholder="Número de guía o notas..."
                    />
                  </div>
                </div>
              )}

              {/* Notas generales */}
              {newStatus && newStatus !== "shipped" && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">Notas (opcional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas adicionales..."
                    className="min-h-[60px]"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {isTerminal ? "Cerrar" : "Cancelar"}
          </Button>
          {!isTerminal && (
            <Button onClick={handleSubmit} disabled={submitting || !newStatus}>
              {submitting && <Loader2 size={16} className="mr-1.5 animate-spin" />}
              Actualizar estado
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
