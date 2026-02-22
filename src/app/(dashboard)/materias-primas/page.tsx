"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Layers,
  Plus,
  Search,
  Pencil,
  PlusCircle,
  SlidersHorizontal,
  History,
  MoreHorizontal,
  Download,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { formatCOP, formatNumber, formatRelativeTime } from "@/lib/format"
import { RAW_MATERIAL_CATEGORIES } from "@/lib/constants"
import type { RawMaterial } from "@/lib/types"
import { MaterialFormDialog } from "./material-form-dialog"
import { AddStockDialog } from "./add-stock-dialog"
import { AdjustStockDialog } from "./adjust-stock-dialog"
import { MovementsDialog } from "./movements-dialog"
import { exportMaterialsToExcel } from "./export-materials"

export default function MateriasPrimasPage() {
  // --- Estado del componente ---
  const [materials, setMaterials] = useState<RawMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")

  // --- Estado de diálogos ---
  const [showForm, setShowForm] = useState(false)
  const [showAddStock, setShowAddStock] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)
  const [showMovements, setShowMovements] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null)

  // --- Último movimiento ---
  const [lastMovementDate, setLastMovementDate] = useState<string | null>(null)

  const supabase = createClient()

  // --- Carga de datos desde Supabase ---
  const fetchMaterials = useCallback(async () => {
    const { data, error } = await supabase
      .from("raw_materials")
      .select("*, supplier:suppliers(name)")
      .eq("is_active", true)
      .order("category")
      .order("name")

    if (!error && data) {
      setMaterials(data as unknown as RawMaterial[])
    }
    setLoading(false)
  }, [supabase])

  const fetchLastMovement = useCallback(async () => {
    const { data } = await supabase
      .from("raw_material_movements")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (data) {
      setLastMovementDate(data.created_at)
    }
  }, [supabase])

  useEffect(() => {
    fetchMaterials()
    fetchLastMovement()
  }, [fetchMaterials, fetchLastMovement])

  // --- Cálculos de estadísticas (memoizados) ---
  const { totalMaterials, lowStock, totalValue, outOfStock } = useMemo(() => ({
    totalMaterials: materials.length,
    lowStock: materials.filter((m) => m.stock > 0 && m.stock <= m.min_stock_alert).length,
    totalValue: materials.reduce((sum, m) => sum + m.stock * m.cost_per_unit, 0),
    outOfStock: materials.filter((m) => m.stock === 0).length,
  }), [materials])

  // --- Filtros (memoizados) ---
  const filteredMaterials = useMemo(() => materials.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase())

    const matchesCategory =
      categoryFilter === "all" || m.category === categoryFilter

    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "ok" && m.stock > m.min_stock_alert) ||
      (stockFilter === "low" && m.stock > 0 && m.stock <= m.min_stock_alert) ||
      (stockFilter === "out" && m.stock === 0)

    return matchesSearch && matchesCategory && matchesStock
  }), [materials, search, categoryFilter, stockFilter])

  // --- Nivel de stock visual ---
  const getStockLevel = (stock: number, minAlert: number) => {
    if (stock === 0) return { color: "bg-error", percent: 0, label: "Agotado" }
    if (stock <= minAlert)
      return { color: "bg-warning", percent: 30, label: "Bajo" }
    return {
      color: "bg-success",
      percent: Math.min(100, (stock / (minAlert * 4)) * 100),
      label: "OK",
    }
  }

  // --- Obtener etiqueta legible de la categoría ---
  const getCategoryLabel = (value: string) => {
    const cat = RAW_MATERIAL_CATEGORIES.find((c) => c.value === value)
    return cat ? cat.label : value
  }

  // --- Acciones de diálogos ---
  const openCreate = () => {
    setSelectedMaterial(null)
    setShowForm(true)
  }

  const openEdit = (m: RawMaterial) => {
    setSelectedMaterial(m)
    setShowForm(true)
  }

  const openAddStock = (m: RawMaterial) => {
    setSelectedMaterial(m)
    setShowAddStock(true)
  }

  const openAdjust = (m: RawMaterial) => {
    setSelectedMaterial(m)
    setShowAdjust(true)
  }

  const openMovements = (m: RawMaterial) => {
    setSelectedMaterial(m)
    setShowMovements(true)
  }

  const handleCompleted = () => {
    fetchMaterials()
    fetchLastMovement()
  }

  // --- Estado de carga ---
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
      {/* Encabezado de página */}
      <PageHeader
        title="Materias Primas"
        description="Control de insumos y materiales de producción"
      >
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await exportMaterialsToExcel(filteredMaterials)
              toast.success("Reporte descargado correctamente")
            } catch {
              toast.error("Error al generar el reporte")
            }
          }}
          disabled={filteredMaterials.length === 0}
        >
          <Download size={16} className="mr-1.5" />
          Descargar reporte
        </Button>
        <Button onClick={openCreate}>
          <Plus size={18} className="mr-1.5" />
          Agregar material
        </Button>
      </PageHeader>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total materiales"
          value={totalMaterials}
          icon="Package"
          format="number"
          borderColor="gold"
          delay={0}
        />
        <StatCard
          label="Stock bajo"
          value={lowStock}
          icon="Package"
          format="number"
          borderColor="warning"
          delay={1}
        />
        <StatCard
          label="Valor en inventario"
          value={totalValue}
          icon="DollarSign"
          format="currency"
          borderColor="info"
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

      {/* Info último movimiento */}
      {lastMovementDate && (
        <p className="text-xs text-muted-foreground">
          Último movimiento: {formatRelativeTime(lastMovementDate)}
        </p>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Buscar por nombre o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {RAW_MATERIAL_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
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

      {/* Tabla de materias primas */}
      {filteredMaterials.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Sin materiales"
          description={
            materials.length === 0
              ? "Agrega materiales para empezar a gestionar tus insumos de producción"
              : "No se encontraron materiales con los filtros aplicados."
          }
        >
          {materials.length === 0 && (
            <Button className="mt-2" onClick={openCreate}>
              <Plus size={18} className="mr-1.5" />
              Agregar material
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
                    Material
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                    Categoría
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                    Stock actual
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                    Unidad
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground hidden md:table-cell">
                    Stock mínimo
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground hidden md:table-cell">
                    Costo unitario
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
                {filteredMaterials.map((m) => {
                  const stockLevel = getStockLevel(m.stock, m.min_stock_alert)
                  return (
                    <TableRow
                      key={m.id}
                      className="hover:bg-cream-dark/50 transition-colors cursor-pointer"
                      onClick={() => openMovements(m)}
                    >
                      {/* Nombre del material */}
                      <TableCell className="font-medium text-sm">
                        <div>
                          {m.name}
                          {m.supplier && (
                            <p className="text-xs text-muted-foreground">
                              {(m.supplier as unknown as { name: string }).name}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Categoría */}
                      <TableCell className="text-sm text-muted-foreground">
                        {getCategoryLabel(m.category)}
                      </TableCell>

                      {/* Stock actual con barra visual */}
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                stockLevel.color
                              )}
                              style={{ width: `${stockLevel.percent}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              "text-sm font-semibold tabular-nums min-w-[24px] text-right",
                              m.stock === 0 && "text-error",
                              m.stock > 0 &&
                                m.stock <= m.min_stock_alert &&
                                "text-warning"
                            )}
                          >
                            {m.stock}
                          </span>
                        </div>
                      </TableCell>

                      {/* Unidad de medida */}
                      <TableCell className="text-sm text-muted-foreground">
                        {m.unit}
                      </TableCell>

                      {/* Stock mínimo de alerta */}
                      <TableCell className="text-sm text-muted-foreground tabular-nums hidden md:table-cell">
                        {m.min_stock_alert}
                      </TableCell>

                      {/* Costo unitario */}
                      <TableCell className="text-sm text-muted-foreground tabular-nums hidden md:table-cell">
                        {formatCOP(m.cost_per_unit)}
                      </TableCell>

                      {/* Valor total (stock * costo) */}
                      <TableCell className="text-sm font-semibold text-gold tabular-nums hidden lg:table-cell">
                        {formatCOP(m.stock * m.cost_per_unit)}
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <TooltipProvider delayDuration={300}>
                          {/* Acciones rápidas en desktop */}
                          <div className="hidden sm:flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={() => openEdit(m)}
                                >
                                  <Pencil size={15} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-success hover:text-success"
                                  onClick={() => openAddStock(m)}
                                >
                                  <PlusCircle size={15} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Agregar stock</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-warning hover:text-warning"
                                  onClick={() => openAdjust(m)}
                                >
                                  <SlidersHorizontal size={15} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ajustar stock</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={() => openMovements(m)}
                                >
                                  <History size={15} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Movimientos</TooltipContent>
                            </Tooltip>
                          </div>

                          {/* Dropdown en móvil */}
                          <div className="sm:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreHorizontal size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(m)}>
                                  <Pencil size={14} className="mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openAddStock(m)}>
                                  <PlusCircle size={14} className="mr-2" />
                                  Agregar stock
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openAdjust(m)}>
                                  <SlidersHorizontal size={14} className="mr-2" />
                                  Ajustar stock
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openMovements(m)}>
                                  <History size={14} className="mr-2" />
                                  Movimientos
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TooltipProvider>
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
              {filteredMaterials.length} materiales ·{" "}
              {formatNumber(
                filteredMaterials.reduce((s, m) => s + m.stock, 0)
              )}{" "}
              unidades totales
            </span>
            <span className="font-semibold text-gold tabular-nums">
              {formatCOP(
                filteredMaterials.reduce(
                  (s, m) => s + m.stock * m.cost_per_unit,
                  0
                )
              )}
            </span>
          </div>
        </div>
      )}

      {/* ===== Diálogos ===== */}
      <MaterialFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        material={selectedMaterial}
        onCompleted={handleCompleted}
      />
      <AddStockDialog
        open={showAddStock}
        onOpenChange={setShowAddStock}
        material={selectedMaterial}
        onCompleted={handleCompleted}
      />
      <AdjustStockDialog
        open={showAdjust}
        onOpenChange={setShowAdjust}
        material={selectedMaterial}
        onCompleted={handleCompleted}
      />
      <MovementsDialog
        open={showMovements}
        onOpenChange={setShowMovements}
        material={selectedMaterial}
      />
    </div>
  )
}
