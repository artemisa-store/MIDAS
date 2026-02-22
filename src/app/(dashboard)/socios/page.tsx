"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Users,
  Plus,
  Banknote,
  Loader2,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  History,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
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
import { PAYMENT_METHODS } from "@/lib/constants"
import { PeriodSelector } from "@/components/shared/period-selector"
import { type PeriodKey, getDateRange } from "@/lib/date-periods"
import { PartnerFormDialog } from "./partner-form-dialog"
import { WithdrawalFormDialog } from "./withdrawal-form-dialog"
import { DeleteWithdrawalDialog } from "./delete-withdrawal-dialog"
import { DeletePartnerDialog } from "./delete-partner-dialog"
import { exportWithdrawalsToExcel } from "./export-withdrawals"
import type { Partner, PartnerWithdrawal } from "@/lib/types"

type WithdrawalExpanded = PartnerWithdrawal & {
  partner?: { name: string }
}

interface MonthlyPartnerData {
  utilidad: number
  retirado: number
  disponible: number
}

interface MonthlyHistory {
  label: string
  from: string
  to: string
  ventas: number
  gastos: number
  utilidad: number
  partners: Record<string, MonthlyPartnerData>
}

export default function SociosPage() {
  const supabase = createClient()

  // Data
  const [partners, setPartners] = useState<Partner[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalExpanded[]>([])
  const [utilidadMes, setUtilidadMes] = useState(0)
  const [retirosTotalMes, setRetirosTotalMes] = useState(0)

  // Historial
  const [historyData, setHistoryData] = useState<MonthlyHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Loading
  const [loadingPartners, setLoadingPartners] = useState(true)
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true)

  // UI
  const [activeTab, setActiveTab] = useState<"retiros" | "socios" | "historial">("retiros")
  const [showPartnerForm, setShowPartnerForm] = useState(false)
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalExpanded | null>(null)
  const [showDeleteWithdrawal, setShowDeleteWithdrawal] = useState(false)
  const [showDeletePartner, setShowDeletePartner] = useState(false)

  // Filtros retiros
  const [searchWithdrawal, setSearchWithdrawal] = useState("")
  const [partnerFilter, setPartnerFilter] = useState("all")
  const [methodFilter, setMethodFilter] = useState("all")

  // ═══ Período dinámico ═══
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("month")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")

  const { dateFrom, dateTo } = useMemo(() => {
    if (selectedPeriod === "custom" && customFrom && customTo) {
      return { dateFrom: customFrom, dateTo: customTo }
    }
    const range = getDateRange(selectedPeriod)
    return { dateFrom: range.from, dateTo: range.to }
  }, [selectedPeriod, customFrom, customTo])

  // ═══ Fetch socios ═══
  const fetchPartners = useCallback(async () => {
    setLoadingPartners(true)
    const { data } = await supabase
      .from("partners")
      .select("*")
      .order("distribution_percentage", { ascending: false })

    if (data) setPartners(data as Partner[])
    setLoadingPartners(false)
  }, [supabase])

  // ═══ Fetch retiros del mes ═══
  const fetchWithdrawals = useCallback(async () => {
    setLoadingWithdrawals(true)
    const { data } = await supabase
      .from("partner_withdrawals")
      .select("*, partner:partners(name)")
      .gte("withdrawal_date", dateFrom)
      .lte("withdrawal_date", dateTo)
      .order("withdrawal_date", { ascending: false })

    if (data) {
      setWithdrawals(data as WithdrawalExpanded[])
      const total = data.reduce((sum: number, w: WithdrawalExpanded) => sum + w.amount, 0)
      setRetirosTotalMes(total)
    }
    setLoadingWithdrawals(false)
  }, [supabase, dateFrom, dateTo])

  // ═══ Fetch utilidad del mes ═══
  const fetchUtilidad = useCallback(async () => {
    // Ventas del mes
    const { data: salesData } = await supabase
      .from("sales")
      .select("total")
      .gte("sale_date", dateFrom)
      .lte("sale_date", dateTo)

    const ventasMes = (salesData || []).reduce((sum, s) => sum + s.total, 0)

    // Gastos del mes
    const { data: expData } = await supabase
      .from("expenses")
      .select("amount")
      .gte("expense_date", dateFrom)
      .lte("expense_date", dateTo)

    const gastosMes = (expData || []).reduce((sum, e) => sum + e.amount, 0)

    setUtilidadMes(ventasMes - gastosMes)
  }, [supabase, dateFrom, dateTo])

  // ═══ Fetch historial (últimos 6 meses) ═══
  const fetchHistory = useCallback(async () => {
    if (partners.length === 0) return
    setLoadingHistory(true)

    const now = new Date()
    const months: MonthlyHistory[] = []

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const from = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-01`
      const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
      const to = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`
      const label = monthDate.toLocaleDateString("es-CO", { month: "short", year: "numeric" })

      // Ventas
      const { data: salesData } = await supabase
        .from("sales")
        .select("total")
        .gte("sale_date", from)
        .lt("sale_date", to)

      const ventas = (salesData || []).reduce((s, v) => s + v.total, 0)

      // Gastos
      const { data: expData } = await supabase
        .from("expenses")
        .select("amount")
        .gte("expense_date", from)
        .lt("expense_date", to)

      const gastos = (expData || []).reduce((s, e) => s + e.amount, 0)
      const utilidad = ventas - gastos

      // Retiros por socio en este mes
      const { data: wData } = await supabase
        .from("partner_withdrawals")
        .select("partner_id, amount")
        .gte("withdrawal_date", from)
        .lt("withdrawal_date", to)

      const retiroMap: Record<string, number> = {}
      for (const w of wData || []) {
        retiroMap[w.partner_id] = (retiroMap[w.partner_id] || 0) + w.amount
      }

      const partnersData: Record<string, MonthlyPartnerData> = {}
      for (const p of partners) {
        const util = utilidad * (p.distribution_percentage / 100)
        const ret = retiroMap[p.id] || 0
        partnersData[p.id] = { utilidad: util, retirado: ret, disponible: util - ret }
      }

      months.push({ label, from, to, ventas, gastos, utilidad, partners: partnersData })
    }

    setHistoryData(months)
    setLoadingHistory(false)
  }, [supabase, partners])

  // ═══ Retiros por socio (para calcular disponible) ═══
  const retirosPorSocio = useMemo(() => {
    const map: Record<string, number> = {}
    for (const w of withdrawals) {
      map[w.partner_id] = (map[w.partner_id] || 0) + w.amount
    }
    return map
  }, [withdrawals])

  // Utilidad disponible por socio
  const partnerUtilities = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of partners) {
      const utilidadProporcional = utilidadMes * (p.distribution_percentage / 100)
      const retirado = retirosPorSocio[p.id] || 0
      map[p.id] = utilidadProporcional - retirado
    }
    return map
  }, [partners, utilidadMes, retirosPorSocio])

  // ═══ Load ═══
  useEffect(() => {
    fetchPartners()
    fetchWithdrawals()
    fetchUtilidad()
  }, [fetchPartners, fetchWithdrawals, fetchUtilidad])

  const fetchAll = useCallback(() => {
    fetchPartners()
    fetchWithdrawals()
    fetchUtilidad()
  }, [fetchPartners, fetchWithdrawals, fetchUtilidad])

  // Cargar historial cuando se abre el tab
  useEffect(() => {
    if (activeTab === "historial" && historyData.length === 0) {
      fetchHistory()
    }
  }, [activeTab, historyData.length, fetchHistory])

  // ═══ Derived ═══
  const activePartners = partners.filter((p) => p.is_active)
  const totalPercentage = partners.reduce((s, p) => s + p.distribution_percentage, 0)
  const utilidadDisponible = utilidadMes - retirosTotalMes

  // ═══ Filtrado de retiros ═══
  const filteredWithdrawals = useMemo(() => {
    let list = [...withdrawals]

    if (searchWithdrawal.trim()) {
      const q = searchWithdrawal.toLowerCase()
      list = list.filter(
        (w) =>
          w.partner?.name?.toLowerCase().includes(q) ||
          w.notes?.toLowerCase().includes(q)
      )
    }

    if (partnerFilter !== "all") {
      list = list.filter((w) => w.partner_id === partnerFilter)
    }

    if (methodFilter !== "all") {
      list = list.filter((w) => w.method === methodFilter)
    }

    return list
  }, [withdrawals, searchWithdrawal, partnerFilter, methodFilter])

  const filteredWithdrawalsTotal = filteredWithdrawals.reduce((s, w) => s + w.amount, 0)

  return (
    <div>
      <PageHeader title="Socios" description="Distribucion de ganancias entre socios">
        <Button
          variant="outline"
          size="sm"
          className="border-border text-muted-foreground hover:text-foreground"
          onClick={() => exportWithdrawalsToExcel(filteredWithdrawals, partners, utilidadMes)}
          disabled={filteredWithdrawals.length === 0}
        >
          <FileSpreadsheet size={16} className="mr-1.5" />
          Exportar
        </Button>
        <Button
          variant="outline"
          className="border-gold/30 text-gold hover:bg-gold/5"
          onClick={() => { setSelectedWithdrawal(null); setShowWithdrawalForm(true) }}
        >
          <Banknote size={16} className="mr-1.5" />
          Registrar retiro
        </Button>
        <Button onClick={() => { setSelectedPartner(null); setShowPartnerForm(true) }}>
          <Plus size={16} className="mr-1.5" />
          Nuevo socio
        </Button>
      </PageHeader>

      {/* ═══ Stat Cards ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Utilidad del mes"
          value={utilidadMes}
          icon="TrendingUp"
          borderColor="success"
          delay={0}
        />
        <StatCard
          label="Retiros del mes"
          value={retirosTotalMes}
          icon="Banknote"
          borderColor="error"
          delay={1}
        />
        <StatCard
          label="Utilidad disponible"
          value={utilidadDisponible}
          icon="DollarSign"
          borderColor="gold"
          delay={2}
        />
        <StatCard
          label="Socios activos"
          value={activePartners.length}
          icon="Users"
          format="number"
          borderColor="info"
          delay={3}
        />
      </div>

      {/* ═══ Partner Cards ═══ */}
      {loadingPartners ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gold" />
        </div>
      ) : partners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {partners.map((p) => {
            const utilidadProporcional = utilidadMes * (p.distribution_percentage / 100)
            const retirado = retirosPorSocio[p.id] || 0
            const disponible = utilidadProporcional - retirado

            return (
              <Card key={p.id} className={`p-4 space-y-3 ${!p.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{p.name}</h3>
                  <StatusBadge status={p.is_active ? "active" : "inactive"} />
                </div>

                {/* Barra de distribución */}
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Distribucion</span>
                    <span className="font-semibold text-foreground">
                      {p.distribution_percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gold transition-all duration-500"
                      style={{ width: `${p.distribution_percentage}%` }}
                    />
                  </div>
                </div>

                {/* Utilidad / Retirado / Disponible */}
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Utilidad</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCOP(utilidadProporcional)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Retirado</p>
                    <p className="text-sm font-semibold tabular-nums text-error">
                      {formatCOP(retirado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Disponible</p>
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        disponible > 0
                          ? "text-success"
                          : disponible < 0
                            ? "text-error"
                            : "text-muted-foreground"
                      }`}
                    >
                      {formatCOP(disponible)}
                    </p>
                  </div>
                </div>

                {/* Acciones rápidas */}
                {p.is_active && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8"
                      onClick={() => {
                        setSelectedWithdrawal(null)
                        setShowWithdrawalForm(true)
                        // Se usará defaultPartnerId en el dialog
                        setSelectedPartner(p)
                      }}
                    >
                      <Banknote size={14} className="mr-1" />
                      Registrar retiro
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => {
                        setSelectedPartner(p)
                        setShowPartnerForm(true)
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      ) : null}

      {/* ═══ Tabs ═══ */}
      <div className="bg-muted p-1 rounded-lg inline-flex gap-1 mb-4">
        {(["retiros", "socios", "historial"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "retiros" ? "Retiros" : tab === "socios" ? "Socios" : "Historial"}
          </button>
        ))}
      </div>

      {/* ═══ Tab: Retiros ═══ */}
      {activeTab === "retiros" && (
        <div className="space-y-4">
          {/* Selector de período */}
          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            customFrom={customFrom}
            onCustomFromChange={setCustomFrom}
            customTo={customTo}
            onCustomToChange={setCustomTo}
          />

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por socio o nota..."
                className="pl-9"
                value={searchWithdrawal}
                onChange={(e) => setSearchWithdrawal(e.target.value)}
              />
            </div>
            <Select value={partnerFilter} onValueChange={setPartnerFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Socio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los socios</SelectItem>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Metodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {PAYMENT_METHODS.map((pm) => (
                  <SelectItem key={pm.value} value={pm.value}>
                    {pm.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingWithdrawals ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gold" />
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="Sin retiros"
              description="No se encontraron retiros en este período."
            />
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-cream hover:bg-cream">
                    <TableHead className="text-xs font-semibold text-muted-foreground">Fecha</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Socio</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right">Monto</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Metodo</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Notas</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWithdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-sm">
                        {formatDateShort(w.withdrawal_date)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {w.partner?.name || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-right font-semibold text-error tabular-nums">
                        -{formatCOP(w.amount)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {PAYMENT_METHODS.find((m) => m.value === w.method)?.label || w.method}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                        {w.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => {
                              setSelectedWithdrawal(w)
                              setShowWithdrawalForm(true)
                            }}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-error hover:text-error"
                            onClick={() => {
                              setSelectedWithdrawal(w)
                              setShowDeleteWithdrawal(true)
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-cream text-xs text-muted-foreground">
                <span>{filteredWithdrawals.length} retiro{filteredWithdrawals.length !== 1 ? "s" : ""}</span>
                <span className="font-semibold text-error tabular-nums">
                  Total: -{formatCOP(filteredWithdrawalsTotal)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Tab: Socios ═══ */}
      {activeTab === "socios" && (
        <div className="space-y-4">
          {totalPercentage > 100 && (
            <div className="flex items-center gap-2 bg-error-bg border border-error/20 rounded-lg p-3 text-sm text-error">
              <AlertTriangle size={16} />
              <span>
                La suma de porcentajes ({totalPercentage}%) supera el 100%. Ajusta la distribucion.
              </span>
            </div>
          )}

          {loadingPartners ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gold" />
            </div>
          ) : partners.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin socios"
              description="Agrega socios para distribuir las ganancias."
            >
              <Button onClick={() => { setSelectedPartner(null); setShowPartnerForm(true) }}>
                <Plus size={16} className="mr-1.5" />
                Nuevo socio
              </Button>
            </EmptyState>
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-cream hover:bg-cream">
                    <TableHead className="text-xs font-semibold text-muted-foreground">Nombre</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">% Distribucion</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm font-medium">{p.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-border rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gold"
                              style={{ width: `${p.distribution_percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold tabular-nums">
                            {p.distribution_percentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.is_active ? "active" : "inactive"} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPartner(p)
                              setShowPartnerForm(true)
                            }}
                          >
                            <Pencil size={14} className="mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-error hover:text-error"
                            onClick={() => {
                              setSelectedPartner(p)
                              setShowDeletePartner(true)
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-cream text-xs text-muted-foreground">
                <span>{partners.length} socio{partners.length !== 1 ? "s" : ""}</span>
                <span className={`font-semibold tabular-nums ${totalPercentage > 100 ? "text-error" : "text-foreground"}`}>
                  Suma: {totalPercentage}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Tab: Historial ═══ */}
      {activeTab === "historial" && (
        <div className="space-y-4">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gold" />
            </div>
          ) : historyData.length === 0 ? (
            <EmptyState
              icon={History}
              title="Sin datos"
              description="No hay datos historicos disponibles."
            />
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-cream hover:bg-cream">
                    <TableHead className="text-xs font-semibold text-muted-foreground sticky left-0 bg-cream">Mes</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right">Ventas</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right">Gastos</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right">Utilidad</TableHead>
                    {partners.filter((p) => p.is_active).map((p) => (
                      <TableHead key={p.id} className="text-xs font-semibold text-muted-foreground text-center min-w-[140px]">
                        {p.name} ({p.distribution_percentage}%)
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.map((month) => (
                    <TableRow key={month.from}>
                      <TableCell className="text-sm font-medium capitalize sticky left-0 bg-card">
                        {month.label}
                      </TableCell>
                      <TableCell className="text-sm text-right tabular-nums">
                        {formatCOP(month.ventas)}
                      </TableCell>
                      <TableCell className="text-sm text-right tabular-nums text-error">
                        {formatCOP(month.gastos)}
                      </TableCell>
                      <TableCell className={`text-sm text-right font-semibold tabular-nums ${month.utilidad >= 0 ? "text-success" : "text-error"}`}>
                        {formatCOP(month.utilidad)}
                      </TableCell>
                      {partners.filter((p) => p.is_active).map((p) => {
                        const pd = month.partners[p.id]
                        if (!pd) return <TableCell key={p.id} className="text-center text-xs text-muted-foreground">—</TableCell>
                        return (
                          <TableCell key={p.id} className="text-center">
                            <div className="space-y-0.5">
                              <p className="text-xs tabular-nums">{formatCOP(pd.utilidad)}</p>
                              <p className="text-[10px] text-error tabular-nums">-{formatCOP(pd.retirado)}</p>
                              <p className={`text-xs font-semibold tabular-nums ${pd.disponible >= 0 ? "text-success" : "text-error"}`}>
                                {formatCOP(pd.disponible)}
                              </p>
                            </div>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Leyenda */}
              <div className="flex items-center gap-4 px-4 py-3 border-t border-border bg-cream text-[10px] text-muted-foreground">
                <span>Por socio: <span className="text-foreground">Utilidad</span> / <span className="text-error">Retirado</span> / <span className="text-success font-semibold">Disponible</span></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Dialogs ═══ */}
      <PartnerFormDialog
        open={showPartnerForm}
        onOpenChange={setShowPartnerForm}
        partner={selectedPartner}
        onCompleted={fetchAll}
      />
      <WithdrawalFormDialog
        open={showWithdrawalForm}
        onOpenChange={(open) => {
          setShowWithdrawalForm(open)
          if (!open) {
            setSelectedWithdrawal(null)
            setSelectedPartner(null)
          }
        }}
        partners={partners}
        partnerUtilities={partnerUtilities}
        withdrawal={selectedWithdrawal}
        defaultPartnerId={!selectedWithdrawal && selectedPartner ? selectedPartner.id : undefined}
        onCompleted={fetchAll}
      />
      <DeleteWithdrawalDialog
        open={showDeleteWithdrawal}
        onOpenChange={(open) => {
          setShowDeleteWithdrawal(open)
          if (!open) setSelectedWithdrawal(null)
        }}
        withdrawal={selectedWithdrawal}
        onCompleted={fetchAll}
      />
      <DeletePartnerDialog
        open={showDeletePartner}
        onOpenChange={(open) => {
          setShowDeletePartner(open)
          if (!open) setSelectedPartner(null)
        }}
        partner={selectedPartner}
        onCompleted={fetchAll}
      />
    </div>
  )
}
