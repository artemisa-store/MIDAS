import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Megaphone } from "lucide-react"

export default function PautasPage() {
  return (
    <div>
      <PageHeader title="Pautas" description="Monitoreo de campañas publicitarias" />
      <EmptyState
        icon={Megaphone}
        title="Módulo en construcción"
        description="Este módulo estará disponible próximamente."
      />
    </div>
  )
}
