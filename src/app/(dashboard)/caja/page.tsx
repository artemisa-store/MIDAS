import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Landmark } from "lucide-react"

export default function CajaPage() {
  return (
    <div>
      <PageHeader title="Caja y Banco" description="Movimientos de efectivo y cuentas bancarias" />
      <EmptyState
        icon={Landmark}
        title="Módulo en construcción"
        description="Este módulo estará disponible próximamente."
      />
    </div>
  )
}
