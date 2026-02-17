import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ShoppingCart } from "lucide-react"

export default function VentasPage() {
  return (
    <div>
      <PageHeader title="Ventas" description="Registro y seguimiento de ventas" />
      <EmptyState
        icon={ShoppingCart}
        title="Módulo en construcción"
        description="Este módulo estará disponible próximamente."
      />
    </div>
  )
}
