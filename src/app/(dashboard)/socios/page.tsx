import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Users } from "lucide-react"

export default function SociosPage() {
  return (
    <div>
      <PageHeader title="Socios" description="Distribución de ganancias entre socios" />
      <EmptyState
        icon={Users}
        title="Módulo en construcción"
        description="Este módulo estará disponible próximamente."
      />
    </div>
  )
}
