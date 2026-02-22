"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Plus,
  Search,
  Truck,
  Phone,
  Mail,
  Pencil,
  Shield,
  MoreHorizontal,
  Package,
  Users,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
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
import { formatRelativeTime } from "@/lib/format"
import type { Supplier } from "@/lib/types"
import { SupplierFormDialog } from "./supplier-form-dialog"

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  // Contadores de uso
  const [materialCounts, setMaterialCounts] = useState<Record<string, number>>({})
  const [expenseCounts, setExpenseCounts] = useState<Record<string, number>>({})

  const { isAdmin } = useAuth()
  const supabase = createClient()

  const fetchSuppliers = useCallback(async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name")

    if (!error && data) {
      setSuppliers(data as unknown as Supplier[])
    }
    setLoading(false)
  }, [supabase])

  const fetchUsageCounts = useCallback(async () => {
    // Contar materiales por proveedor
    const { data: matData } = await supabase
      .from("raw_materials")
      .select("supplier_id")
      .not("supplier_id", "is", null)

    if (matData) {
      const counts: Record<string, number> = {}
      matData.forEach((m) => {
        const id = m.supplier_id as string
        counts[id] = (counts[id] || 0) + 1
      })
      setMaterialCounts(counts)
    }

    // Contar gastos por proveedor
    const { data: expData } = await supabase
      .from("expenses")
      .select("supplier_id")
      .not("supplier_id", "is", null)

    if (expData) {
      const counts: Record<string, number> = {}
      expData.forEach((e) => {
        const id = e.supplier_id as string
        counts[id] = (counts[id] || 0) + 1
      })
      setExpenseCounts(counts)
    }
  }, [supabase])

  useEffect(() => {
    fetchSuppliers()
    fetchUsageCounts()
  }, [fetchSuppliers, fetchUsageCounts])

  // --- Stats ---
  const totalSuppliers = suppliers.filter((s) => s.is_active).length
  const inactiveSuppliers = suppliers.filter((s) => !s.is_active).length
  const withContact = suppliers.filter(
    (s) => s.is_active && (s.phone || s.email)
  ).length
  const linkedToMaterials = Object.keys(materialCounts).length

  // --- Filtros ---
  const filteredSuppliers = suppliers.filter((s) => {
    const q = search.toLowerCase()
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      (s.contact_name || "").toLowerCase().includes(q) ||
      (s.supplies_description || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q)

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && s.is_active) ||
      (statusFilter === "inactive" && !s.is_active)

    return matchesSearch && matchesStatus
  })

  // --- Acciones ---
  const openCreate = () => {
    setSelectedSupplier(null)
    setShowForm(true)
  }

  const openEdit = (s: Supplier) => {
    setSelectedSupplier(s)
    setShowForm(true)
  }

  const handleCompleted = () => {
    fetchSuppliers()
    fetchUsageCounts()
  }

  // --- Acceso restringido ---
  if (!isAdmin) {
    return (
      <EmptyState
        icon={Shield}
        title="Acceso restringido"
        description="Solo el administrador puede gestionar proveedores."
      />
    )
  }

  // --- Loading ---
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
      <PageHeader
        title="Proveedores"
        description="Directorio de proveedores de productos e insumos"
      >
        <Button onClick={openCreate}>
          <Plus size={18} className="mr-1.5" />
          Nuevo proveedor
        </Button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Proveedores activos"
          value={totalSuppliers}
          icon="Users"
          format="number"
          borderColor="gold"
          delay={0}
        />
        <StatCard
          label="Con datos de contacto"
          value={withContact}
          icon="Users"
          format="number"
          borderColor="success"
          delay={1}
        />
        <StatCard
          label="Vinculados a materiales"
          value={linkedToMaterials}
          icon="Package"
          format="number"
          borderColor="info"
          delay={2}
        />
        <StatCard
          label="Inactivos"
          value={inactiveSuppliers}
          icon="Users"
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
            placeholder="Buscar por nombre, contacto o suministros..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      {filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Sin proveedores"
          description={
            suppliers.length === 0
              ? "Registra tu primer proveedor para empezar a organizar tus compras."
              : "No se encontraron proveedores con los filtros aplicados."
          }
        >
          {suppliers.length === 0 && (
            <Button className="mt-2" onClick={openCreate}>
              <Plus size={18} className="mr-1.5" />
              Nuevo proveedor
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
                    Proveedor
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground hidden md:table-cell">
                    Contacto
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground hidden lg:table-cell">
                    Suministra
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground text-center">
                    Uso
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                    Estado
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((s) => {
                  const matCount = materialCounts[s.id] || 0
                  const expCount = expenseCounts[s.id] || 0
                  return (
                    <TableRow
                      key={s.id}
                      className="hover:bg-cream-dark/50 transition-colors cursor-pointer"
                      onClick={() => openEdit(s)}
                    >
                      {/* Nombre + datos de contacto rápidos */}
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {s.phone && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone size={11} />
                                {s.phone}
                              </span>
                            )}
                            {s.email && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground md:hidden">
                                <Mail size={11} />
                                {s.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Contacto */}
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-0.5">
                          {s.contact_name && (
                            <p className="text-sm">{s.contact_name}</p>
                          )}
                          {s.email && (
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          )}
                          {!s.contact_name && !s.email && (
                            <p className="text-xs text-muted-foreground">—</p>
                          )}
                        </div>
                      </TableCell>

                      {/* Suministra */}
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate hidden lg:table-cell">
                        {s.supplies_description || "—"}
                      </TableCell>

                      {/* Uso (materiales + gastos) */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {matCount > 0 && (
                            <Tooltip>
                              <TooltipProvider delayDuration={300}>
                                <TooltipTrigger>
                                  <span className="inline-flex items-center gap-1 text-xs text-info bg-info/10 px-2 py-0.5 rounded-full">
                                    <Package size={11} />
                                    {matCount}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{matCount} material{matCount !== 1 ? "es" : ""}</TooltipContent>
                              </TooltipProvider>
                            </Tooltip>
                          )}
                          {expCount > 0 && (
                            <Tooltip>
                              <TooltipProvider delayDuration={300}>
                                <TooltipTrigger>
                                  <span className="inline-flex items-center gap-1 text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                                    <Users size={11} />
                                    {expCount}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{expCount} gasto{expCount !== 1 ? "s" : ""}</TooltipContent>
                              </TooltipProvider>
                            </Tooltip>
                          )}
                          {matCount === 0 && expCount === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Estado */}
                      <TableCell>
                        <StatusBadge status={s.is_active ? "active" : "inactive"} />
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {/* Desktop */}
                        <div className="hidden sm:flex items-center justify-end">
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={() => openEdit(s)}
                                >
                                  <Pencil size={15} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        {/* Móvil */}
                        <div className="sm:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(s)}>
                                <Pencil size={14} className="mr-2" />
                                Editar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-cream border-t border-border text-sm text-muted-foreground">
            {filteredSuppliers.length} proveedor{filteredSuppliers.length !== 1 ? "es" : ""}
            {statusFilter !== "all" && ` (${statusFilter === "active" ? "activos" : "inactivos"})`}
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <SupplierFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        supplier={selectedSupplier}
        onCompleted={handleCompleted}
      />
    </div>
  )
}
