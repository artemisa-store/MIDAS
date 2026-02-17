import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TrendingDown } from "lucide-react"

export default function GastosPage() {
  return (
    <div>
      <PageHeader title="Gastos" description="Control de gastos y compras" />
      <EmptyState
        icon={TrendingDown}
        title="Módulo en construcción"
        description="Este módulo estará disponible próximamente."
      />
    </div>
  )
}
