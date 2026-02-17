"use client"

import { useEffect, useState, useCallback } from "react"
import { ArrowUpDown, Search, ArrowUpRight, ArrowDownRight, RefreshCw, Minus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
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
import { formatDateShort, formatRelativeTime } from "@/lib/format"
import type { MovementType } from "@/lib/types"

// Configuración visual de tipos de movimiento
const MOVEMENT_CONFIG = {
  entry: {
    label: "Entrada",
    color: "text-success",
    bg: "bg-success-bg",
    icon: ArrowUpRight,
    prefix: "+",
  },
  exit: {
    label: "Salida",
    color: "text-error",
    bg: "bg-error-bg",
    icon: ArrowDownRight,
    prefix: "-",
  },
  return: {
    label: "Devolución",
    color: "text-info",
    bg: "bg-info-bg",
    icon: RefreshCw,
    prefix: "+",
  },
  adjustment: {
    label: "Ajuste",
    color: "text-warning",
    bg: "bg-warning-bg",
    icon: Minus,
    prefix: "",
  },
}

interface MovementWithDetails {
  id: string
  product_variant_id: string
  movement_type: MovementType
  quantity: number
  previous_stock: number
  new_stock: number
  notes: string | null
  created_at: string
  variant: {
    color: string
    color_hex: string
    size: string
    cut: string
    product: { name: string }
  } | null
  creator: { full_name: string } | null
}

export default function MovimientosPage() {
  const [movements, setMovements] = useState<MovementWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("all")
  const supabase = createClient()

  const fetchMovements = useCallback(async () => {
    const { data, error } = await supabase
      .from("inventory_movements")
      .select(`
        *,
        variant:product_variants(
          color, color_hex, size, cut,
          product:products(name)
        ),
        creator:users!inventory_movements_created_by_fkey(full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(100)

    if (!error && data) {
      setMovements(data as unknown as MovementWithDetails[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  const filteredMovements = movements.filter(
    (m) => typeFilter === "all" || m.movement_type === typeFilter
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 skeleton-shimmer" />
        <Skeleton className="h-96 rounded-xl skeleton-shimmer" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimientos de inventario"
        description="Historial de entradas, salidas, devoluciones y ajustes"
      />

      {/* Filtro */}
      <div className="flex gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo de movimiento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="entry">Entradas</SelectItem>
            <SelectItem value="exit">Salidas</SelectItem>
            <SelectItem value="return">Devoluciones</SelectItem>
            <SelectItem value="adjustment">Ajustes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      {filteredMovements.length === 0 ? (
        <EmptyState
          icon={ArrowUpDown}
          title="Sin movimientos"
          description="Los movimientos aparecerán cuando registres entradas, ventas o ajustes de inventario."
        />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-cream hover:bg-cream">
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                    Fecha
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                    Tipo
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                    Producto
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground text-center">
                    Cantidad
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground text-center hidden md:table-cell">
                    Stock anterior → nuevo
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground hidden lg:table-cell">
                    Registrado por
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground hidden lg:table-cell">
                    Notas
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((m) => {
                  const config = MOVEMENT_CONFIG[m.movement_type]
                  const Icon = config.icon
                  return (
                    <TableRow
                      key={m.id}
                      className="hover:bg-cream-dark/50 transition-colors"
                    >
                      <TableCell className="text-sm">
                        <div>
                          <span>{formatDateShort(m.created_at)}</span>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(m.created_at)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                            config.bg,
                            config.color
                          )}
                        >
                          <Icon size={12} />
                          {config.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {m.variant && (
                            <span
                              className="size-3 rounded-full border border-border shrink-0"
                              style={{ backgroundColor: m.variant.color_hex }}
                            />
                          )}
                          <div className="text-sm">
                            <span className="font-medium">
                              {m.variant?.product?.name || "—"}
                            </span>
                            <span className="text-muted-foreground ml-1">
                              {m.variant?.color} {m.variant?.size}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            config.color
                          )}
                        >
                          {config.prefix}
                          {Math.abs(m.quantity)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums hidden md:table-cell">
                        {m.previous_stock} → {m.new_stock}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                        {m.creator?.full_name || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate hidden lg:table-cell">
                        {m.notes || "—"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
