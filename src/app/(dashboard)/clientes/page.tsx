import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { UserCircle } from "lucide-react"

export default function ClientesPage() {
  return (
    <div>
      <PageHeader title="Clientes" description="Base de datos de clientes (CRM)" />
      <EmptyState
        icon={UserCircle}
        title="Módulo en construcción"
        description="Este módulo estará disponible próximamente."
      />
    </div>
  )
}
