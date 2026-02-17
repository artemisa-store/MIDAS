import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { User } from "lucide-react"

export default function PerfilPage() {
  return (
    <div>
      <PageHeader title="Mi Perfil" description="Información personal y contraseña" />
      <EmptyState
        icon={User}
        title="Módulo en construcción"
        description="Este módulo estará disponible próximamente."
      />
    </div>
  )
}
