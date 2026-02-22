"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Plus,
  Search,
  Megaphone,
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
import { formatCOP, formatDateShort, formatNumber } from "@/lib/format"
import { CampaignFormDialog } from "./campaign-form-dialog"
import type { Campaign } from "@/lib/types"

const OBJECTIVE_LABELS: Record<string, string> = {
  interaction: "Interaccion",
  messages: "Mensajes",
  traffic: "Trafico",
  conversions: "Conversiones",
}

export default function PautasPage() {
  const supabase = createClient()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .order("start_date", { ascending: false })

    if (data) setCampaigns(data as Campaign[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  // Stats
  const activeCampaigns = campaigns.filter((c) => c.status === "active")
  const inversionActiva = activeCampaigns.reduce((s, c) => s + c.budget, 0)
  const totalSalesAttributed = campaigns.reduce((s, c) => s + (c.sales_attributed || 0), 0)
  const campaignsWithROI = campaigns.filter((c) => c.roi !== null && c.roi !== undefined)
  const avgROI = campaignsWithROI.length > 0
    ? Math.round(campaignsWithROI.reduce((s, c) => s + (c.roi || 0), 0) / campaignsWithROI.length)
    : 0

  // Plataformas unicas para el filtro
  const platforms = useMemo(() => {
    const set = new Set(campaigns.map((c) => c.platform))
    return Array.from(set).sort()
  }, [campaigns])

  // Filtrado
  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      const q = search.toLowerCase()
      const matchesSearch = c.name.toLowerCase().includes(q)
      const matchesStatus = statusFilter === "all" || c.status === statusFilter
      const matchesPlatform = platformFilter === "all" || c.platform === platformFilter
      return matchesSearch && matchesStatus && matchesPlatform
    })
  }, [campaigns, search, statusFilter, platformFilter])

  const filteredBudgetTotal = filtered.reduce((s, c) => s + c.budget, 0)

  const openCreate = () => {
    setSelectedCampaign(null)
    setShowForm(true)
  }

  const openEdit = (c: Campaign) => {
    setSelectedCampaign(c)
    setShowForm(true)
  }

  return (
    <div>
      <PageHeader title="Pautas" description="Monitoreo de campanas publicitarias">
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-1.5" />
          Nueva campana
        </Button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Inversion activa"
          value={inversionActiva}
          icon="DollarSign"
          borderColor="gold"
          delay={0}
        />
        <StatCard
          label="Campanas activas"
          value={activeCampaigns.length}
          icon="TrendingUp"
          format="number"
          borderColor="success"
          delay={1}
        />
        <StatCard
          label="Ventas atribuidas"
          value={totalSalesAttributed}
          icon="ShoppingCart"
          format="number"
          borderColor="info"
          delay={2}
        />
        <StatCard
          label="ROI promedio"
          value={avgROI}
          icon="TrendingUp"
          format="number"
          borderColor="warning"
          delay={3}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar campana..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="finished">Finalizadas</SelectItem>
            <SelectItem value="paused">Pausadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
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
          icon={Megaphone}
          title="Sin campanas"
          description={
            campaigns.length === 0
              ? "Registra tu primera campana publicitaria."
              : "No se encontraron campanas con los filtros aplicados."
          }
        >
          {campaigns.length === 0 && (
            <Button className="mt-2" onClick={openCreate}>
              <Plus size={16} className="mr-1.5" />
              Nueva campana
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-cream hover:bg-cream">
                  <TableHead className="text-xs font-semibold text-muted-foreground">Campana</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground hidden sm:table-cell">Plataforma</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">Presupuesto</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Objetivo</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground hidden lg:table-cell">Fechas</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right hidden md:table-cell">Alcance</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right hidden lg:table-cell">Mensajes</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right hidden md:table-cell">ROI</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className="hover:bg-cream-dark/50 transition-colors cursor-pointer"
                    onClick={() => openEdit(c)}
                  >
                    <TableCell>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground sm:hidden">{c.platform}</p>
                    </TableCell>
                    <TableCell className="text-sm hidden sm:table-cell">{c.platform}</TableCell>
                    <TableCell className="text-sm text-right font-semibold tabular-nums">
                      {formatCOP(c.budget)}
                    </TableCell>
                    <TableCell className="text-sm hidden md:table-cell">
                      {OBJECTIVE_LABELS[c.objective] || c.objective}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                      {formatDateShort(c.start_date)}
                      {c.end_date ? ` — ${formatDateShort(c.end_date)}` : " — ..."}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums hidden md:table-cell">
                      {c.reach ? formatNumber(c.reach) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums hidden lg:table-cell">
                      {c.messages_received ? formatNumber(c.messages_received) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums hidden md:table-cell">
                      {c.roi !== null && c.roi !== undefined ? (
                        <span className={c.roi >= 0 ? "text-success font-semibold" : "text-error font-semibold"}>
                          {c.roi > 0 ? "+" : ""}{c.roi}%
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status as "active" | "finished" | "paused"} />
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
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
            <span>{filtered.length} campana{filtered.length !== 1 ? "s" : ""}</span>
            <span className="font-semibold text-foreground tabular-nums">
              Total invertido: {formatCOP(filteredBudgetTotal)}
            </span>
          </div>
        </div>
      )}

      {/* Dialog */}
      <CampaignFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        campaign={selectedCampaign}
        onCompleted={fetchCampaigns}
      />
    </div>
  )
}
