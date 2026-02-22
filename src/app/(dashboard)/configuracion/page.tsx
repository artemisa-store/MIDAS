"use client"

import Link from "next/link"
import { Users, ChevronRight } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Card } from "@/components/ui/card"
import { Shield } from "lucide-react"

const SECTIONS = [
  {
    title: "Usuarios",
    description: "Gestión de cuentas, roles y permisos del sistema",
    href: "/configuracion/usuarios",
    icon: Users,
    borderColor: "border-l-gold",
  },
]

export default function ConfiguracionPage() {
  const { isAdmin } = useAuth()

  if (!isAdmin) {
    return (
      <EmptyState
        icon={Shield}
        title="Acceso restringido"
        description="Solo el administrador puede acceder a la configuración."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Configuración general del sistema"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card
              className={`relative border-l-[3px] ${section.borderColor} p-5 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer group`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <section.icon size={20} className="text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {section.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {section.description}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  className="text-muted-foreground/40 group-hover:text-gold group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
                />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
