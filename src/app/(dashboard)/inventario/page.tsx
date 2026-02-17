"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Package,
  Plus,
  ArrowUpDown,
  Search,
  Filter,
  AlertTriangle,
  XCircle,
  Boxes,
  DollarSign,
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
import { cn } from "@/lib/utils"
import { formatCOP, formatNumber } from "@/lib/format"
import { AddStockDialog } from "./add-stock-dialog"
import { AdjustStockDialog } from "./adjust-stock-dialog"

interface VariantWithProduct {
  id: string
  product_id: string
  color: string
  color_hex: string
  size: string
  cut: string
  stock: number
  min_stock_alert: number
  cost_per_unit: number
  sku_variant: string
  is_active: boolean
  product: { name: string; base_price: number } | null
}

export default function InventarioPage() {
  const [variants, setVariants] = useState<VariantWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [colorFilter, setColorFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")
  const [showAddStock, setShowAddStock] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<VariantWithProduct | null>(null)
  const supabase = createClient()

  const fetchVariants = useCallback(async () => {
    const { data, error } = await supabase
      .from("product_variants")
      .select("*, product:products(name, base_price)")
      .eq("is_active", true)
      .order("product_id")
      .order("color")
      .order("size")

    if (!error && data) {
      setVariants(data as unknown as VariantWithProduct[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchVariants()
  }, [fetchVariants])

  // Cálculos de estadísticas
  const totalUnits = variants.reduce((sum, v) => sum + v.stock, 0)
  const totalValue = variants.reduce((sum, v) => sum + v.stock * v.cost_per_unit, 0)
  const lowStock = variants.filter(
    (v) => v.stock > 0 && v.stock <= v.min_stock_alert
  ).length
  const outOfStock = variants.filter((v) => v.stock === 0).length

  // Filtros
  const filteredVariants = variants.filter((v) => {
    const matchesSearch =
      v.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.sku_variant?.toLowerCase().includes(search.toLowerCase()) ||
      v.color.toLowerCase().includes(search.toLowerCase())

    const matchesColor =
      colorFilter === "all" || v.color === colorFilter

    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "ok" && v.stock > v.min_stock_alert) ||
      (stockFilter === "low" && v.stock > 0 && v.stock <= v.min_stock_alert) ||
      (stockFilter === "out" && v.stock === 0)

    return matchesSearch && matchesColor && matchesStock
  })

  // Colores únicos para el filtro
  const uniqueColors = [...new Set(variants.map((v) => v.color))]

  // Nivel de stock visual
  const getStockLevel = (stock: number, minAlert: number) => {
    if (stock === 0) return { color: "bg-error", percent: 0, label: "Agotado" }
    if (stock <= minAlert) return { color: "bg-warning", percent: 30, label: "Bajo" }
    return { color: "bg-success", percent: Math.min(100, (stock / (minAlert * 4)) * 100), label: "OK" }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 skeleton-shimmer" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl skeleton-shimmer" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl skeleton-shimmer" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Inventario" description="Control de stock y variantes de producto">
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/inventario/productos">
              <Boxes size={18} className="mr-1.5" />
              Catálogo
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/inventario/movimientos">
              <ArrowUpDown size={18} className="mr-1.5" />
              Movimientos
            </Link>
          </Button>
          <Button onClick={() => setShowAddStock(true)}>
            <Plus size={18} className="mr-1.5" />
            Entrada de stock
          </Button>
        </div>
      </PageHeader>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total unidades"
          value={totalUnits}
          icon="Package"
          format="number"
          borderColor="gold"
          delay={0}
        />
        <StatCard
          label="Valor del inventario"
          value={totalValue}
          icon="DollarSign"
          format="currency"
          borderColor="info"
          delay={1}
        />
        <StatCard
          label="Stock bajo"
          value={lowStock}
          icon="Package"
          format="number"
          borderColor="warning"
          delay={2}
        />
        <StatCard
          label="Agotados"
          value={outOfStock}
          icon="Package"
          format="number"
          borderColor="error"
          delay={3}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por producto, SKU o color..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={colorFilter} onValueChange={setColorFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los colores</SelectItem>
            {uniqueColors.map((color) => (
              <SelectItem key={color} value={color}>
                {color}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo el stock</SelectItem>
            <SelectItem value="ok">Stock OK</SelectItem>
            <SelectItem value="low">Stock bajo</SelectItem>
            <SelectItem value="out">Agotado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla de inventario */}
      {filteredVariants.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Sin inventario"
          description={
            variants.length === 0
              ? "Agrega productos desde el catálogo para empezar a gestionar inventario."
              : "No se encontraron variantes con los filtros aplicados."
          }
        >
          {variants.length === 0 && (
            <Button asChild className="mt-2">
              <Link href="/inventario/productos">Ir al catálogo</Link>
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
                    Producto
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                    Color
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                    Talla
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                    Corte
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                    Stock
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground hidden md:table-cell">
                    Costo ud.
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground hidden lg:table-cell">
                    Valor total
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVariants.map((v) => {
                  const stockLevel = getStockLevel(v.stock, v.min_stock_alert)
                  return (
                    <TableRow
                      key={v.id}
                      className="hover:bg-cream-dark/50 transition-colors"
                    >
                      <TableCell className="font-medium text-sm">
                        {v.product?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="size-3.5 rounded-full border border-border shrink-0"
                            style={{ backgroundColor: v.color_hex }}
                          />
                          <span className="text-sm">{v.color}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{v.size}</TableCell>
                      <TableCell className="text-sm">{v.cut}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", stockLevel.color)}
                              style={{ width: `${stockLevel.percent}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              "text-sm font-semibold tabular-nums min-w-[24px] text-right",
                              v.stock === 0 && "text-error",
                              v.stock > 0 && v.stock <= v.min_stock_alert && "text-warning"
                            )}
                          >
                            {v.stock}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums hidden md:table-cell">
                        {formatCOP(v.cost_per_unit)}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-gold tabular-nums hidden lg:table-cell">
                        {formatCOP(v.stock * v.cost_per_unit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setSelectedVariant(v)
                            setShowAdjust(true)
                          }}
                        >
                          Ajustar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totales al pie */}
          <div className="px-4 py-3 bg-cream border-t border-border flex justify-between text-sm">
            <span className="text-muted-foreground">
              {filteredVariants.length} variantes · {formatNumber(filteredVariants.reduce((s, v) => s + v.stock, 0))} unidades
            </span>
            <span className="font-semibold text-gold tabular-nums">
              {formatCOP(filteredVariants.reduce((s, v) => s + v.stock * v.cost_per_unit, 0))}
            </span>
          </div>
        </div>
      )}

      {/* Diálogos */}
      <AddStockDialog
        open={showAddStock}
        onOpenChange={setShowAddStock}
        onCompleted={fetchVariants}
      />

      {selectedVariant && (
        <AdjustStockDialog
          open={showAdjust}
          onOpenChange={(open) => {
            setShowAdjust(open)
            if (!open) setSelectedVariant(null)
          }}
          variant={selectedVariant}
          onCompleted={fetchVariants}
        />
      )}
    </div>
  )
}
