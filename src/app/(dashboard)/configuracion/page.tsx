import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Settings } from "lucide-react"

export default function ConfiguracionPage() {
  return (
    <div>
      <PageHeader title="Configuración" description="Configuración general del sistema" />
      <EmptyState
        icon={Settings}
        title="Módulo en construcción"
        description="Este módulo estará disponible próximamente."
      />
    </div>
  )
}
