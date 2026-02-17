import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ClipboardList } from "lucide-react"

export default function CuentasPage() {
  return (
    <div>
      <PageHeader title="Cuentas" description="Cuentas por cobrar y por pagar" />
      <EmptyState
        icon={ClipboardList}
        title="Módulo en construcción"
        description="Este módulo estará disponible próximamente."
      />
    </div>
  )
}
