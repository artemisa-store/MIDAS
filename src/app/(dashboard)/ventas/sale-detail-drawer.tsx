"use client"

import { useMemo } from "react"
import {
  Printer,
  FileText,
  Mail,
  RotateCcw,
  ArrowRightLeft,
  Phone,
  MapPin,
  Truck,
  CreditCard,
  Package,
  CheckCircle2,
  Circle,
  Wallet,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatCOP, formatDateTime, formatDateShort } from "@/lib/format"
import { PAYMENT_METHODS, SALE_CHANNELS, SALE_STATUS_CONFIG } from "@/lib/constants"
import type { SaleStatus } from "@/lib/types"
import { printReceipt, type SaleExpanded } from "../facturacion/recibo-termico"
import { downloadInvoicePDF } from "../facturacion/factura-pdf"

interface SaleDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale: SaleExpanded | null
  onChangeStatus: () => void
  onProcessReturn: () => void
  onSaleUpdated: () => void
}

// Pasos del timeline de estado
const STATUS_STEPS: { key: SaleStatus; label: string }[] = [
  { key: "paid", label: "Pagada" },
  { key: "shipped", label: "Enviada" },
  { key: "delivered", label: "Entregada" },
]

export function SaleDetailDrawer({
  open,
  onOpenChange,
  sale,
  onChangeStatus,
  onProcessReturn,
}: SaleDetailDrawerProps) {
  // Calcular descuento
  const discountAmount = useMemo(() => {
    if (!sale || !sale.discount_value || sale.discount_value <= 0) return 0
    if (sale.discount_type === "percentage") {
      return Math.round(sale.subtotal * (sale.discount_value / 100))
    }
    return sale.discount_value
  }, [sale])

  // Labels de canal y método
  const channelLabel = useMemo(() => {
    if (!sale) return ""
    return SALE_CHANNELS.find((c) => c.value === sale.sale_channel)?.label || sale.sale_channel
  }, [sale])

  const paymentLabel = useMemo(() => {
    if (!sale) return ""
    return PAYMENT_METHODS.find((m) => m.value === sale.payment_method)?.label || sale.payment_method
  }, [sale])

  // Total items
  const totalItems = useMemo(() => {
    if (!sale?.items) return 0
    return sale.items.reduce((sum, item) => sum + item.quantity, 0)
  }, [sale])

  // Índice del estado actual en el timeline
  const currentStepIndex = useMemo(() => {
    if (!sale) return -1
    return STATUS_STEPS.findIndex((s) => s.key === sale.status)
  }, [sale])

  const isReturned = sale?.status === "returned"

  if (!sale) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 bg-white/70 backdrop-blur-2xl border-white/60 shadow-[0_16px_60px_rgba(0,0,0,0.1)] overflow-hidden max-h-[90vh] gap-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-white/30 relative z-10 bg-white/40 shrink-0">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
                {sale.invoice_number}
              </DialogTitle>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                {formatDateTime(sale.sale_date || sale.created_at)}
              </p>
            </div>
            <StatusBadge status={sale.status} />
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto relative z-10 custom-scrollbar flex-1 min-h-0">
          {/* Cliente */}
          {sale.client && (
            <div className="bg-white/60 rounded-2xl p-4 space-y-2 border border-white/80 shadow-sm">
              <p className="text-xs uppercase tracking-[0.08em] font-bold text-muted-foreground/80">
                Cliente
              </p>
              <p className="text-[15px] font-bold">{sale.client.full_name}</p>
              {sale.client.phone_whatsapp && (
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Phone size={14} className="text-gold" /> {sale.client.phone_whatsapp}
                </p>
              )}
              {sale.client.city && (
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <MapPin size={14} className="text-info" /> {sale.client.city}
                </p>
              )}
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-xs uppercase tracking-[0.08em] font-bold text-muted-foreground/80 mb-3">
              Productos ({totalItems} und.)
            </p>
            <div className="space-y-2">
              {(sale.items || []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/60 border border-white/80 shadow-sm hover:bg-white/80 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">
                      {item.variant?.product?.name || "Producto"}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                      {[item.variant?.color, item.variant?.size, item.variant?.cut]
                        .filter(Boolean)
                        .join(" · ")}{" "}
                      <span className="text-foreground/60 px-1">×</span> {item.quantity}
                    </p>
                  </div>
                  <span className="text-[15px] font-extrabold tabular-nums text-gold ml-3 shrink-0">
                    {formatCOP(item.quantity * item.unit_price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen financiero */}
          <div className="bg-white/60 rounded-2xl p-4 space-y-2 border border-white/80 shadow-sm">
            <p className="text-xs uppercase tracking-[0.08em] font-bold text-muted-foreground/80 mb-3">
              Resumen
            </p>
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatCOP(sale.subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground flex items-center gap-1">
                  Descuento
                  {sale.discount_type === "percentage" && <span className="bg-error/10 text-error px-1.5 py-0.5 rounded text-[10px]">{sale.discount_value}%</span>}
                </span>
                <span className="tabular-nums text-error font-bold">-{formatCOP(discountAmount)}</span>
              </div>
            )}
            {sale.shipping_cost > 0 && (
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">Envío</span>
                <span className="tabular-nums">{formatCOP(sale.shipping_cost)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-3 mt-3 border-t border-white">
              <span className="font-extrabold text-foreground">Total</span>
              <span className="font-[family-name:var(--font-display)] text-xl font-extrabold text-gold tabular-nums">
                {formatCOP(sale.total)}
              </span>
            </div>
          </div>

          {/* Info de pago y canal */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/60 rounded-2xl p-4 border border-white/80 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground/80 mb-1.5 flex items-center gap-1.5">
                <Wallet size={12} className="text-gold" /> Método
              </p>
              <p className="text-[13px] font-extrabold text-foreground">{paymentLabel}</p>
            </div>
            <div className="bg-white/60 rounded-2xl p-4 border border-white/80 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground/80 mb-1.5 flex items-center gap-1.5">
                <Package size={12} className="text-info" /> Canal
              </p>
              <p className="text-[13px] font-extrabold text-foreground">{channelLabel}</p>
            </div>
          </div>

          {/* Info de crédito */}
          {sale.is_credit && (
            <div className="bg-warning/10 rounded-2xl p-4 border border-warning/20 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-warning/20 rounded-lg">
                  <CreditCard size={14} className="text-warning" />
                </div>
                <p className="text-xs uppercase tracking-[0.08em] font-extrabold text-warning">
                  Venta a crédito
                </p>
              </div>

              <div className="space-y-2">
                {sale.credit_fee_percentage > 0 && (
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">
                      Comisión ({sale.credit_fee_percentage}%)
                    </span>
                    <span className="tabular-nums">{formatCOP(sale.credit_fee_amount || 0)}</span>
                  </div>
                )}
                {sale.total_with_fee > 0 && (
                  <div className="flex justify-between text-[15px] pt-1 border-t border-warning/10 mt-1">
                    <span className="font-bold text-foreground">Total financiado</span>
                    <span className="tabular-nums font-extrabold text-warning">
                      {formatCOP(sale.total_with_fee)}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-warning/10">
                  <div className="bg-white/50 rounded-xl p-2.5">
                    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Cuotas</span>
                    <span className="tabular-nums font-bold text-foreground">{sale.credit_installments}</span>
                  </div>
                  <div className="bg-white/50 rounded-xl p-2.5">
                    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Abono Inicial</span>
                    <span className="tabular-nums font-bold text-foreground">{formatCOP(sale.initial_payment || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline de estado */}
          <div>
            <p className="text-xs uppercase tracking-[0.08em] font-bold text-muted-foreground/80 mb-4">
              Progreso de la Orden
            </p>

            {isReturned ? (
              <div className="flex items-center gap-4 bg-error/10 rounded-2xl p-4 border border-error/20 shadow-sm">
                <div className="p-2 border border-error/20 bg-error/10 rounded-full">
                  <RotateCcw size={20} className="text-error" />
                </div>
                <div>
                  <p className="text-[15px] font-extrabold text-error">Orden Devuelta</p>
                  <p className="text-xs font-medium text-error/80 mt-0.5">
                    Esta orden fue cancelada o retornada.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center bg-white/60 p-5 rounded-2xl border border-white/80 shadow-sm relative z-0">
                {STATUS_STEPS.map((step, i) => {
                  const isDone = currentStepIndex >= i
                  const isCurrent = currentStepIndex === i

                  return (
                    <div key={step.key} className="flex items-center flex-1 relative">
                      {/* Dot */}
                      <div className="flex flex-col items-center gap-2 relative z-10">
                        {isDone ? (
                          <div className={`rounded-full p-0.5 ${isCurrent ? "bg-gold/20 text-gold shadow-[0_0_15px_rgba(201,165,92,0.4)]" : "bg-success/20 text-success"}`}>
                            <CheckCircle2 size={24} className="fill-current text-white" />
                          </div>
                        ) : (
                          <div className="rounded-full p-0.5 bg-black/5">
                            <Circle size={24} className="text-muted-foreground/30 fill-white" />
                          </div>
                        )}
                        <span
                          className={`absolute top-8 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${isDone ? "text-foreground" : "text-muted-foreground/50"
                            }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {/* Line */}
                      {i < STATUS_STEPS.length - 1 && (
                        <div
                          className={`flex-1 h-1.5 -mx-2 z-0 rounded-none relative overflow-hidden bg-black/5`}
                        >
                          <div className={`absolute inset-y-0 left-0 transition-all duration-1000 ${currentStepIndex > i ? "w-full bg-success opacity-100" : "w-0"}`} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="h-6" /* Spacer for the timeline labels */ />

          {/* Info de envío */}
          {(sale.status === "shipped" || sale.status === "delivered") &&
            sale.shipping_address && (
              <div className="bg-info/10 rounded-2xl p-4 border border-info/20 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-info/20 rounded-md">
                    <Truck size={14} className="text-info" />
                  </div>
                  <p className="text-xs uppercase tracking-[0.08em] font-extrabold text-info">
                    Información de envío
                  </p>
                </div>
                <p className="text-[13px] font-medium text-foreground">{sale.shipping_address}</p>
              </div>
            )}

          {/* Notas */}
          {sale.notes && (
            <div>
              <p className="text-xs uppercase tracking-[0.08em] font-bold text-muted-foreground/80 mb-2">
                Notas adicionales
              </p>
              <div className="bg-white/50 rounded-2xl p-4 border border-white/60 shadow-inner">
                <p className="text-[13px] font-medium text-foreground whitespace-pre-line italic">
                  "{sale.notes}"
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <DialogFooter className="p-4 border-t border-white/30 bg-white/40 flex-row flex-wrap gap-2 justify-center sm:justify-start relative z-10 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => printReceipt(sale)}
            title="Imprimir recibo"
            className="flex-1 sm:flex-none bg-white/60 hover:bg-white backdrop-blur-md border-white/80 shadow-sm font-semibold"
          >
            <Printer size={16} className="mr-2 text-gold" />
            Recibo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadInvoicePDF(sale)}
            title="Descargar PDF"
            className="flex-1 sm:flex-none bg-white/60 hover:bg-white backdrop-blur-md border-white/80 shadow-sm font-semibold"
          >
            <FileText size={16} className="mr-2 text-info" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const emailSubject = encodeURIComponent(`Factura ${sale.invoice_number} — Casa Artemisa`)
              const emailBody = encodeURIComponent(
                `Hola ${sale.client?.full_name || ""},\n\nAdjunto la factura ${sale.invoice_number} por un valor de ${formatCOP(sale.total)}.\n\nGracias por tu compra.\n— Casa Artemisa`
              )
              window.open(`mailto:${sale.client?.email || ""}?subject=${emailSubject}&body=${emailBody}`)
            }}
            title="Enviar por email"
            className="flex-1 sm:flex-none bg-white/60 hover:bg-white backdrop-blur-md border-white/80 shadow-sm font-semibold"
          >
            <Mail size={16} className="mr-2 text-warning" />
            Email
          </Button>

          <div className="w-full h-px bg-border/40 my-1 hidden sm:block" />

          {sale.status !== "returned" && sale.status !== "delivered" && (
            <Button size="sm" onClick={onChangeStatus} className="flex-1 font-bold shadow-md shadow-gold/20">
              <ArrowRightLeft size={16} className="mr-2" />
              Cambiar Estado
            </Button>
          )}
          {sale.status !== "returned" && (
            <Button variant="destructive" size="sm" onClick={onProcessReturn} className="flex-1 font-bold shadow-md shadow-error/20">
              <RotateCcw size={16} className="mr-2" />
              Devolver Orden
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
