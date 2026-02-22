"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Receipt,
  Plus,
  Search,
  Eye,
  Printer,
  CreditCard,
} from "lucide-react"
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
import { SALE_STATUS_CONFIG } from "@/lib/constants"
import type { SaleStatus } from "@/lib/types"
import { NuevaFacturaDialog } from "./nueva-factura-dialog"
import { FacturaDetailDialog } from "./factura-detail-dialog"
import { AbonosDialog } from "./abonos-dialog"
import { printReceipt, type SaleExpanded } from "./recibo-termico"

export default function FacturacionPage() {
  // === Estado principal ===
  const [sales, setSales] = useState<SaleExpanded[]>([])
  const [loading, setLoading] = useState(true)

  // === Filtros ===
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // === Diálogos ===
  const [showNuevaFactura, setShowNuevaFactura] = useState(false)
  const [showDetalle, setShowDetalle] = useState(false)
  const [showAbonos, setShowAbonos] = useState(false)
  const [selectedSale, setSelectedSale] = useState<SaleExpanded | null>(null)

  const supabase = createClient()

  // === Cargar ventas desde Supabase ===
  const fetchSales = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase
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

    if (!error && data) {
      setSales(data as unknown as SaleExpanded[])
    } else {
      console.error("Error al cargar facturas:", error)
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  // === Estadísticas del mes actual ===
  const stats = useMemo(() => {
    const ahora = new Date()
    const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

    // Filtrar ventas del mes actual
    const ventasDelMes = sales.filter((s) => {
      const fecha = new Date(s.sale_date || s.created_at)
      return fecha >= primerDiaMes
    })

    const totalFacturado = ventasDelMes.reduce((sum, s) => sum + s.total, 0)
    const cantidadFacturas = ventasDelMes.length
    const promedio = cantidadFacturas > 0 ? Math.round(totalFacturado / cantidadFacturas) : 0
    const pendientes = ventasDelMes.filter((s) => s.status === "pending").length

    return { cantidadFacturas, totalFacturado, promedio, pendientes }
  }, [sales])

  // === Filtrado de ventas ===
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Filtro por búsqueda (número de factura o nombre de cliente)
      const searchLower = search.toLowerCase()
      const matchesSearch =
        !search ||
        sale.invoice_number?.toLowerCase().includes(searchLower) ||
        sale.client?.full_name?.toLowerCase().includes(searchLower)

      // Filtro por estado
      const matchesStatus =
        statusFilter === "all" || sale.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [sales, search, statusFilter])

  // === Calcular el descuento visible ===
  const getDiscountDisplay = (sale: SaleExpanded): string => {
    if (!sale.discount_value || sale.discount_value <= 0) return "-"
    if (sale.discount_type === "percentage") {
      const valor = Math.round(sale.subtotal * (sale.discount_value / 100))
      return `-${formatCOP(valor)}`
    }
    return `-${formatCOP(sale.discount_value)}`
  }

  // === Abrir detalle de una factura ===
  const handleViewDetail = (sale: SaleExpanded) => {
    setSelectedSale(sale)
    setShowDetalle(true)
  }

  // === Imprimir recibo térmico ===
  const handlePrint = (sale: SaleExpanded) => {
    printReceipt(sale)
  }

  // === Abrir panel de abonos ===
  const handleViewAbonos = (sale: SaleExpanded) => {
    setSelectedSale(sale)
    setShowAbonos(true)
  }

  // === Estado de carga (skeleton) ===
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56 skeleton-shimmer" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl skeleton-shimmer" />
          ))}
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 w-64 skeleton-shimmer" />
          <Skeleton className="h-9 w-40 skeleton-shimmer" />
        </div>
        <Skeleton className="h-96 rounded-xl skeleton-shimmer" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Encabezado de página */}
      <PageHeader title="Facturación" description="Gestión de facturas y recibos térmicos">
        <Button onClick={() => setShowNuevaFactura(true)}>
          <Plus size={18} className="mr-1.5" />
          Nueva Factura
        </Button>
      </PageHeader>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Facturas del mes"
          value={stats.cantidadFacturas}
          icon="ShoppingCart"
          format="number"
          borderColor="gold"
          delay={0}
        />
        <StatCard
          label="Total facturado"
          value={stats.totalFacturado}
          icon="DollarSign"
          format="currency"
          borderColor="gold"
          delay={1}
        />
        <StatCard
          label="Promedio por factura"
          value={stats.promedio}
          icon="DollarSign"
          format="currency"
          borderColor="info"
          delay={2}
        />
        <StatCard
          label="Facturas pendientes"
          value={stats.pendientes}
          icon="ShoppingCart"
          format="number"
          borderColor="warning"
          delay={3}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Buscar por # factura o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
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
      </div>

      {/* Tabla de facturas o estado vacío */}
      {filteredSales.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin facturas"
          description={
            sales.length === 0
              ? "A\u00FAn no se han creado facturas. Crea la primera para empezar."
              : "No se encontraron facturas con los filtros aplicados."
          }
        >
          {sales.length === 0 && (
            <Button className="mt-2" onClick={() => setShowNuevaFactura(true)}>
              <Plus size={18} className="mr-1.5" />
              Crear primera factura
            </Button>
          )}
        </EmptyState>
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
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground text-center">
                    Items
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground text-right hidden md:table-cell">
                    Subtotal
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground text-right hidden lg:table-cell">
                    Descuento
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground text-right hidden lg:table-cell">
                    Envío
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground text-right">
                    Total
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
                {filteredSales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className="hover:bg-cream-dark/50 transition-colors cursor-pointer"
                    onClick={() => handleViewDetail(sale)}
                  >
                    {/* Número de factura */}
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

                    {/* Fecha */}
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateShort(sale.sale_date || sale.created_at)}
                    </TableCell>

                    {/* Cliente */}
                    <TableCell className="text-sm">
                      {sale.client?.full_name || "—"}
                    </TableCell>

                    {/* Cantidad de items */}
                    <TableCell className="text-sm text-center tabular-nums">
                      {getTotalItems(sale.items)}
                    </TableCell>

                    {/* Subtotal */}
                    <TableCell className="text-sm text-right tabular-nums text-muted-foreground hidden md:table-cell">
                      {formatCOP(sale.subtotal)}
                    </TableCell>

                    {/* Descuento */}
                    <TableCell className="text-sm text-right tabular-nums text-muted-foreground hidden lg:table-cell">
                      {getDiscountDisplay(sale)}
                    </TableCell>

                    {/* Envío */}
                    <TableCell className="text-sm text-right tabular-nums text-muted-foreground hidden lg:table-cell">
                      {sale.shipping_cost > 0 ? formatCOP(sale.shipping_cost) : "-"}
                    </TableCell>

                    {/* Total */}
                    <TableCell className="text-sm text-right font-semibold text-gold tabular-nums">
                      {formatCOP(sale.total)}
                    </TableCell>

                    {/* Estado */}
                    <TableCell className="text-center">
                      <StatusBadge status={sale.status} />
                    </TableCell>

                    {/* Acciones */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Ver detalle"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewDetail(sale)
                          }}
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Imprimir recibo"
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePrint(sale)
                          }}
                        >
                          <Printer size={14} />
                        </Button>
                        {sale.is_credit && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            title="Ver abonos"
                            className="text-gold hover:text-gold"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewAbonos(sale)
                            }}
                          >
                            <CreditCard size={14} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pie de tabla con resumen */}
          <div className="px-4 py-3 bg-cream border-t border-border flex justify-between text-sm">
            <span className="text-muted-foreground">
              {filteredSales.length} factura{filteredSales.length !== 1 ? "s" : ""}
            </span>
            <span className="font-semibold text-gold tabular-nums">
              {formatCOP(filteredSales.reduce((sum, s) => sum + s.total, 0))}
            </span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DIÁLOGOS */}
      {/* ============================================================ */}

      {/* Diálogo de nueva factura */}
      <NuevaFacturaDialog
        open={showNuevaFactura}
        onOpenChange={setShowNuevaFactura}
        onCompleted={fetchSales}
      />

      {/* Diálogo de detalle de factura */}
      <FacturaDetailDialog
        open={showDetalle}
        onOpenChange={(isOpen) => {
          setShowDetalle(isOpen)
          if (!isOpen) setSelectedSale(null)
        }}
        sale={selectedSale}
      />

      {/* Diálogo de abonos (crédito) */}
      <AbonosDialog
        open={showAbonos}
        onOpenChange={(isOpen) => {
          setShowAbonos(isOpen)
          if (!isOpen) setSelectedSale(null)
        }}
        sale={selectedSale}
        onPaymentRegistered={fetchSales}
      />
    </div>
  )
}
