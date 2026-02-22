"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  DollarSign,
  ShoppingCart,
  Search,
  Eye,
  ArrowRightLeft,
  RotateCcw,
  Download,
  BarChart3,
  List,
  CreditCard,
  Package,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
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
import { formatCOP, formatDateShort, getTotalItems } from "@/lib/format"
import { SALE_STATUS_CONFIG, SALE_CHANNELS, PAYMENT_METHODS } from "@/lib/constants"
import { type PeriodKey, PERIODS, toLocalDate, getDateRange } from "@/lib/date-periods"
import type { SaleStatus } from "@/lib/types"
import { PeriodSelector } from "@/components/shared/period-selector"
import { type SaleExpanded } from "../facturacion/recibo-termico"
import { SalesCharts } from "./sales-charts"
import { SaleDetailDrawer } from "./sale-detail-drawer"
import { ChangeStatusDialog } from "./change-status-dialog"
import { ProcessReturnDialog } from "./process-return-dialog"
import { exportSalesToExcel } from "./export-sales"

// === Tabs ===
type TabKey = "listado" | "analisis"

export default function VentasPage() {
  const supabase = createClient()

  // === Estado principal ===
  const [sales, setSales] = useState<SaleExpanded[]>([])
  const [loading, setLoading] = useState(true)

  // === Periodo ===
  const [period, setPeriod] = useState<PeriodKey>("month")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")

  // === Filtros ===
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [channelFilter, setChannelFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")

  // === Tab ===
  const [activeTab, setActiveTab] = useState<TabKey>("listado")

  // === Drawers y diálogos ===
  const [showDetail, setShowDetail] = useState(false)
  const [showChangeStatus, setShowChangeStatus] = useState(false)
  const [showReturn, setShowReturn] = useState(false)
  const [selectedSale, setSelectedSale] = useState<SaleExpanded | null>(null)

  // === Crédito pendiente ===
  const [creditPending, setCreditPending] = useState(0)

  // === Cargar ventas ===
  const fetchSales = useCallback(async () => {
    setLoading(true)

    let dateFrom: string
    let dateTo: string

    if (period === "custom") {
      // sale_date es tipo DATE en Supabase, usar YYYY-MM-DD directo
      dateFrom = customFrom || ""
      // Para "hasta", usar el día siguiente para incluir todo el día final
      if (customTo) {
        const nextDay = new Date(customTo + "T00:00:00")
        nextDay.setDate(nextDay.getDate() + 1)
        dateTo = toLocalDate(nextDay)
      } else {
        dateTo = ""
      }
    } else {
      const range = getDateRange(period)
      dateFrom = range.from
      dateTo = range.to
    }

    let query = supabase
      .from("sales")
      .select(`
        *,
        client:clients(*),
        items:sale_items(
          *,
          variant:product_variants(
            *,
            product:products(*)
          )
        )
      `)
      .order("created_at", { ascending: false })

    if (dateFrom) {
      query = query.gte("sale_date", dateFrom)
    }
    if (dateTo) {
      query = query.lt("sale_date", dateTo)
    }

    const { data, error } = await query

    if (!error && data) {
      setSales(data as unknown as SaleExpanded[])
    } else {
      console.error("Error al cargar ventas:", error)
    }

    setLoading(false)
  }, [supabase, period, customFrom, customTo])

  // Cargar crédito pendiente total
  const fetchCreditPending = useCallback(async () => {
    const { data } = await supabase
      .from("accounts_receivable")
      .select("remaining_amount")
      .gt("remaining_amount", 0)
      .in("status", ["pending", "partial", "overdue"])

    if (data) {
      setCreditPending(data.reduce((sum, r) => sum + (r.remaining_amount || 0), 0))
    }
  }, [supabase])

  useEffect(() => {
    fetchSales()
    fetchCreditPending()
  }, [fetchSales, fetchCreditPending])

  // === Estadísticas ===
  const stats = useMemo(() => {
    const activeSales = sales.filter((s) => s.status !== "returned")
    const returnedSales = sales.filter((s) => s.status === "returned")

    const totalVendido = activeSales.reduce((sum, s) => sum + s.total, 0)
    const cantidadVentas = activeSales.length
    const ticketPromedio = cantidadVentas > 0 ? Math.round(totalVendido / cantidadVentas) : 0
    const unidadesVendidas = activeSales.reduce(
      (sum, s) => sum + (s.items || []).reduce((q, i) => q + i.quantity, 0),
      0
    )
    const devoluciones = returnedSales.length

    return { totalVendido, cantidadVentas, ticketPromedio, unidadesVendidas, devoluciones }
  }, [sales])

  // === Filtrado ===
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const searchLower = search.toLowerCase()
      const matchesSearch =
        !search ||
        sale.invoice_number?.toLowerCase().includes(searchLower) ||
        sale.client?.full_name?.toLowerCase().includes(searchLower)

      const matchesStatus = statusFilter === "all" || sale.status === statusFilter
      const matchesChannel = channelFilter === "all" || sale.sale_channel === channelFilter
      const matchesPayment = paymentFilter === "all" || sale.payment_method === paymentFilter

      return matchesSearch && matchesStatus && matchesChannel && matchesPayment
    })
  }, [sales, search, statusFilter, channelFilter, paymentFilter])

  // === Handlers ===
  const handleViewDetail = (sale: SaleExpanded) => {
    setSelectedSale(sale)
    setShowDetail(true)
  }

  const handleChangeStatus = (sale: SaleExpanded) => {
    setSelectedSale(sale)
    setShowChangeStatus(true)
  }

  const handleProcessReturn = (sale: SaleExpanded) => {
    setSelectedSale(sale)
    setShowReturn(true)
  }

  const handleSaleUpdated = () => {
    fetchSales()
    fetchCreditPending()
  }

  // === Loading skeleton ===
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56 skeleton-shimmer" />
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-lg skeleton-shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl skeleton-shimmer" />
          ))}
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-64 skeleton-shimmer" />
          <Skeleton className="h-9 w-40 skeleton-shimmer" />
          <Skeleton className="h-9 w-40 skeleton-shimmer" />
        </div>
        <Skeleton className="h-96 rounded-xl skeleton-shimmer" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Ventas" description="Gestión y análisis de ventas">
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await exportSalesToExcel(filteredSales)
              toast.success("Reporte descargado correctamente")
            } catch {
              toast.error("Error al generar el reporte")
            }
          }}
          disabled={filteredSales.length === 0}
        >
          <Download size={16} className="mr-1.5" />
          Descargar reporte
        </Button>
      </PageHeader>

      {/* Selector de periodo */}
      <PeriodSelector
        selectedPeriod={period}
        onPeriodChange={setPeriod}
        customFrom={customFrom}
        onCustomFromChange={setCustomFrom}
        customTo={customTo}
        onCustomToChange={setCustomTo}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total vendido"
          value={stats.totalVendido}
          icon="DollarSign"
          format="currency"
          borderColor="gold"
          delay={0}
        />
        <StatCard
          label="Cantidad de ventas"
          value={stats.cantidadVentas}
          icon="ShoppingCart"
          format="number"
          borderColor="gold"
          delay={1}
        />
        <StatCard
          label="Ticket promedio"
          value={stats.ticketPromedio}
          icon="DollarSign"
          format="currency"
          borderColor="info"
          delay={2}
        />
        <StatCard
          label="Unidades vendidas"
          value={stats.unidadesVendidas}
          icon="Package"
          format="units"
          borderColor="gold"
          delay={3}
        />
        <StatCard
          label="Devoluciones"
          value={stats.devoluciones}
          icon="ShoppingCart"
          format="number"
          borderColor="error"
          delay={4}
        />
        <StatCard
          label="Crédito pendiente"
          value={creditPending}
          icon="DollarSign"
          format="currency"
          borderColor="warning"
          delay={5}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-cream rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("listado")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "listado"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <List size={15} />
          Listado
        </button>
        <button
          onClick={() => setActiveTab("analisis")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "analisis"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 size={15} />
          Análisis
        </button>
      </div>

      {/* Tab: Análisis */}
      {activeTab === "analisis" && <SalesCharts sales={sales} />}

      {/* Tab: Listado */}
      {activeTab === "listado" && (
        <>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Buscar factura o cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {(Object.keys(SALE_STATUS_CONFIG) as SaleStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {SALE_STATUS_CONFIG[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los canales</SelectItem>
                {SALE_CHANNELS.map((ch) => (
                  <SelectItem key={ch.value} value={ch.value}>
                    {ch.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Método pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los métodos</SelectItem>
                {PAYMENT_METHODS.map((pm) => (
                  <SelectItem key={pm.value} value={pm.value}>
                    {pm.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

          </div>

          {/* Tabla o estado vacío */}
          {filteredSales.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Sin ventas"
              description={
                sales.length === 0
                  ? "No hay ventas registradas en el periodo seleccionado."
                  : "No se encontraron ventas con los filtros aplicados."
              }
            />
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-cream hover:bg-cream">
                      <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                        # Factura
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                        Fecha
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                        Cliente
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground hidden md:table-cell">
                        Canal
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground text-center">
                        Items
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground text-right">
                        Total
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground hidden lg:table-cell">
                        M. Pago
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground text-center">
                        Estado
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => {
                      const channelLabel =
                        SALE_CHANNELS.find((c) => c.value === sale.sale_channel)?.label ||
                        sale.sale_channel
                      const paymentLabel =
                        PAYMENT_METHODS.find((m) => m.value === sale.payment_method)?.label ||
                        sale.payment_method

                      return (
                        <TableRow
                          key={sale.id}
                          className="hover:bg-cream-dark/50 transition-colors cursor-pointer"
                          onClick={() => handleViewDetail(sale)}
                        >
                          <TableCell className="font-semibold text-sm text-gold">
                            <span className="flex items-center gap-1.5">
                              {sale.invoice_number}
                              {sale.is_credit && (
                                <span title="Crédito">
                                  <CreditCard size={13} className="text-warning" />
                                </span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateShort(sale.sale_date || sale.created_at)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {sale.client?.full_name || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                            {channelLabel}
                          </TableCell>
                          <TableCell className="text-sm text-center tabular-nums">
                            {getTotalItems(sale.items)}
                          </TableCell>
                          <TableCell className="text-sm text-right font-semibold text-gold tabular-nums">
                            {formatCOP(sale.total)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                            {paymentLabel}
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusBadge status={sale.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div
                              className="flex items-center justify-end gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                title="Ver detalle"
                                onClick={() => handleViewDetail(sale)}
                              >
                                <Eye size={14} />
                              </Button>
                              {sale.status !== "returned" && sale.status !== "delivered" && (
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  title="Cambiar estado"
                                  onClick={() => handleChangeStatus(sale)}
                                >
                                  <ArrowRightLeft size={14} />
                                </Button>
                              )}
                              {sale.status !== "returned" && (
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  title="Devolución"
                                  className="text-error hover:text-error"
                                  onClick={() => handleProcessReturn(sale)}
                                >
                                  <RotateCcw size={14} />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pie de tabla */}
              <div className="px-4 py-3 bg-cream border-t border-border flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {filteredSales.length} venta{filteredSales.length !== 1 ? "s" : ""}
                </span>
                <span className="font-semibold text-gold tabular-nums">
                  {formatCOP(filteredSales.reduce((sum, s) => sum + s.total, 0))}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* DRAWERS Y DIÁLOGOS                                          */}
      {/* ============================================================ */}

      <SaleDetailDrawer
        open={showDetail}
        onOpenChange={(isOpen) => {
          setShowDetail(isOpen)
          if (!isOpen) setSelectedSale(null)
        }}
        sale={selectedSale}
        onChangeStatus={() => {
          setShowDetail(false)
          setShowChangeStatus(true)
        }}
        onProcessReturn={() => {
          setShowDetail(false)
          setShowReturn(true)
        }}
        onSaleUpdated={handleSaleUpdated}
      />

      <ChangeStatusDialog
        open={showChangeStatus}
        onOpenChange={(isOpen) => {
          setShowChangeStatus(isOpen)
          if (!isOpen) setSelectedSale(null)
        }}
        sale={selectedSale}
        onStatusChanged={handleSaleUpdated}
      />

      <ProcessReturnDialog
        open={showReturn}
        onOpenChange={(isOpen) => {
          setShowReturn(isOpen)
          if (!isOpen) setSelectedSale(null)
        }}
        sale={selectedSale}
        onReturnProcessed={handleSaleUpdated}
      />
    </div>
  )
}
