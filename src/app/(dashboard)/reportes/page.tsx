import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { BarChart3 } from "lucide-react"

export default function ReportesPage() {
  return (
    <div>
      <PageHeader title="Reportes" description="Reportes financieros y operativos" />
      <EmptyState
        icon={BarChart3}
        title="Módulo en construcción"
        description="Este módulo estará disponible próximamente."
      />
    </div>
  )
}
