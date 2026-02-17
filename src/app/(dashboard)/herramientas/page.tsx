import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Wrench } from "lucide-react"

export default function HerramientasPage() {
  return (
    <div>
      <PageHeader title="Herramientas" description="Suscripciones y herramientas del negocio" />
      <EmptyState
        icon={Wrench}
        title="Módulo en construcción"
        description="Este módulo estará disponible próximamente."
      />
    </div>
  )
}
