import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Receipt } from "lucide-react"

export default function FacturacionPage() {
  return (
    <div>
      <PageHeader title="Facturación" description="Generación de facturas PDF y térmica" />
      <EmptyState
        icon={Receipt}
        title="Módulo en construcción"
        description="Este módulo estará disponible próximamente."
      />
    </div>
  )
}
