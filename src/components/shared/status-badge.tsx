import { cn } from "@/lib/utils"

type StatusType =
  | "paid"
  | "pending"
  | "shipped"
  | "delivered"
  | "returned"
  | "active"
  | "inactive"
  | "partial"
  | "overdue"
  | "paused"
  | "cancelled"
  | "finished"

// Configuración visual de cada estado
const STATUS_CONFIG: Record<StatusType, { label: string; className: string }> = {
  paid: { label: "Pagada", className: "bg-success-bg text-success border-success/20" },
  pending: { label: "Pendiente", className: "bg-warning-bg text-warning border-warning/20" },
  shipped: { label: "Enviada", className: "bg-info-bg text-info border-info/20" },
  delivered: { label: "Entregada", className: "bg-success-bg text-success border-success/20" },
  returned: { label: "Devuelta", className: "bg-error-bg text-error border-error/20" },
  active: { label: "Activa", className: "bg-success-bg text-success border-success/20" },
  inactive: { label: "Inactiva", className: "bg-muted text-muted-foreground border-border" },
  partial: { label: "Parcial", className: "bg-warning-bg text-warning border-warning/20" },
  overdue: { label: "Vencida", className: "bg-error-bg text-error border-error/20" },
  paused: { label: "Pausada", className: "bg-warning-bg text-warning border-warning/20" },
  cancelled: { label: "Cancelada", className: "bg-error-bg text-error border-error/20" },
  finished: { label: "Finalizada", className: "bg-muted text-muted-foreground border-border" },
}

interface StatusBadgeProps {
  status: StatusType
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  if (!config) return null

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {label || config.label}
    </span>
  )
}
