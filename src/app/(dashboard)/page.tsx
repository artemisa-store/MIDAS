"use client"

import { useAuth } from "@/components/providers/auth-provider"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { Skeleton } from "@/components/ui/skeleton"
import { getGreeting, formatCurrentDate } from "@/lib/format"

export default function DashboardPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Saludo personalizado */}
      <div>
        <h1 className="font-serif text-2xl md:text-[28px] font-semibold text-foreground">
          {getGreeting()}, {user?.full_name?.split(" ")[0] || "Usuario"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 capitalize">
          {formatCurrentDate()}
        </p>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Ventas del mes"
          value={0}
          icon="DollarSign"
          format="currency"
          borderColor="gold"
          delay={0}
        />
        <StatCard
          label="Gastos del mes"
          value={0}
          icon="TrendingDown"
          format="currency"
          borderColor="error"
          delay={1}
        />
        <StatCard
          label="Ganancia neta"
          value={0}
          icon="TrendingUp"
          format="currency"
          borderColor="success"
          delay={2}
        />
        <StatCard
          label="Unidades vendidas"
          value={0}
          icon="Package"
          format="units"
          borderColor="gold"
          delay={3}
        />
        <StatCard
          label="Dinero en caja"
          value={0}
          icon="Banknote"
          format="currency"
          borderColor="info"
          delay={4}
        />
        <StatCard
          label="Dinero en banco"
          value={0}
          icon="Building2"
          format="currency"
          borderColor="info"
          delay={5}
        />
      </div>

      {/* Placeholder para gráficas y actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6 shadow-card">
          <h2 className="text-base font-semibold mb-4">Ventas vs Gastos</h2>
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            Las gráficas se mostrarán cuando tengas datos registrados
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h2 className="text-base font-semibold mb-4">Ventas por color</h2>
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            Sin datos aún
          </div>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h2 className="text-base font-semibold mb-4">Actividad reciente</h2>
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          No hay actividad registrada aún. Empieza registrando una venta o gasto.
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64 skeleton-shimmer" />
        <Skeleton className="h-4 w-48 mt-2 skeleton-shimmer" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl skeleton-shimmer" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-80 rounded-xl skeleton-shimmer" />
        <Skeleton className="h-80 rounded-xl skeleton-shimmer" />
      </div>
    </div>
  )
}
