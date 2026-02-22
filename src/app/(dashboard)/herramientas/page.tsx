"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Plus,
  Search,
  Wrench,
  Pencil,
  Loader2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCOP, formatDateShort } from "@/lib/format"
import { SubscriptionFormDialog } from "./subscription-form-dialog"
import type { Subscription } from "@/lib/types"

const CYCLE_LABELS: Record<string, string> = {
  monthly: "Mensual",
  annual: "Anual",
}

export default function HerramientasPage() {
  const supabase = createClient()

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null)

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .order("tool_name")

    if (data) setSubscriptions(data as Subscription[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  // Stats
  const activeSubs = subscriptions.filter((s) => s.status === "active")
  const pausedSubs = subscriptions.filter((s) => s.status === "paused")
  const totalMensual = activeSubs.reduce((s, sub) => s + sub.monthly_cost, 0)
  const gastoAnual = totalMensual * 12

  // Filtrado
  const filtered = useMemo(() => {
    return subscriptions.filter((s) => {
      const q = search.toLowerCase()
      const matchesSearch =
        s.tool_name.toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === "all" || s.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [subscriptions, search, statusFilter])

  const filteredTotal = filtered
    .filter((s) => s.status === "active")
    .reduce((s, sub) => s + sub.monthly_cost, 0)

  const openCreate = () => {
    setSelectedSub(null)
    setShowForm(true)
  }

  const openEdit = (s: Subscription) => {
    setSelectedSub(s)
    setShowForm(true)
  }

  return (
    <div>
      <PageHeader title="Herramientas" description="Suscripciones y herramientas del negocio">
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-1.5" />
          Nueva suscripcion
        </Button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Costo mensual"
          value={totalMensual}
          icon="DollarSign"
          borderColor="gold"
          delay={0}
        />
        <StatCard
          label="Activas"
          value={activeSubs.length}
          icon="TrendingUp"
          format="number"
          borderColor="success"
          delay={1}
        />
        <StatCard
          label="Pausadas"
          value={pausedSubs.length}
          icon="Package"
          format="number"
          borderColor="warning"
          delay={2}
        />
        <StatCard
          label="Gasto anual estimado"
          value={gastoAnual}
          icon="Banknote"
          borderColor="info"
          delay={3}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o categoria..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="paused">Pausadas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Sin suscripciones"
          description={
            subscriptions.length === 0
              ? "Registra tu primera suscripcion."
              : "No se encontraron suscripciones con los filtros aplicados."
          }
        >
          {subscriptions.length === 0 && (
            <Button className="mt-2" onClick={openCreate}>
              <Plus size={16} className="mr-1.5" />
              Nueva suscripcion
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-cream hover:bg-cream">
                  <TableHead className="text-xs font-semibold text-muted-foreground">Herramienta</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">Costo mensual</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground hidden sm:table-cell">Ciclo</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground hidden lg:table-cell">Proxima renovacion</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sub) => (
                  <TableRow
                    key={sub.id}
                    className="hover:bg-cream-dark/50 transition-colors cursor-pointer"
                    onClick={() => openEdit(sub)}
                  >
                    <TableCell>
                      <p className="text-sm font-medium">{sub.tool_name}</p>
                      <p className="text-xs text-muted-foreground md:hidden">
                        {sub.category || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                      {sub.category || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-right font-semibold tabular-nums">
                      {formatCOP(sub.monthly_cost)}
                    </TableCell>
                    <TableCell className="text-sm hidden sm:table-cell">
                      {CYCLE_LABELS[sub.billing_cycle] || sub.billing_cycle}
                    </TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">
                      {formatDateShort(sub.next_renewal_date)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={sub.status as "active" | "paused" | "cancelled"} />
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(sub)}
                      >
                        <Pencil size={14} className="mr-1" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-cream text-xs text-muted-foreground">
            <span>
              {filtered.length} suscripcion{filtered.length !== 1 ? "es" : ""}
            </span>
            <span className="font-semibold text-foreground tabular-nums">
              Total mensual: {formatCOP(filteredTotal)}
            </span>
          </div>
        </div>
      )}

      {/* Dialog */}
      <SubscriptionFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        subscription={selectedSub}
        onCompleted={fetchSubscriptions}
      />
    </div>
  )
}
