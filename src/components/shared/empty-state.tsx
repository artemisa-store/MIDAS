import { cn } from "@/lib/utils"
import { PackageOpen, type LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title?: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title = "No hay datos",
  description = "Aún no se han registrado datos en esta sección.",
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className
      )}
    >
      <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon size={28} className="text-muted-foreground/60" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
