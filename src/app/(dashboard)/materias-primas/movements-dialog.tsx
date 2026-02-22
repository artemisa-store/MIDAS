"use client"

import { useState, useEffect } from "react"
import { Loader2, ArrowDownCircle, ArrowUpCircle, RotateCcw, SlidersHorizontal } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"
import { formatDateShort } from "@/lib/format"
import type { RawMaterial, RawMaterialMovement } from "@/lib/types"

const MOVEMENT_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof ArrowDownCircle; sign: string }
> = {
  entry: {
    label: "Entrada",
    color: "bg-success-bg text-success border-success/20",
    icon: ArrowDownCircle,
    sign: "+",
  },
  exit: {
    label: "Salida",
    color: "bg-error-bg text-error border-error/20",
    icon: ArrowUpCircle,
    sign: "-",
  },
  return: {
    label: "Devolución",
    color: "bg-info-bg text-info border-info/20",
    icon: RotateCcw,
    sign: "+",
  },
  adjustment: {
    label: "Ajuste",
    color: "bg-warning-bg text-warning border-warning/20",
    icon: SlidersHorizontal,
    sign: "",
  },
}

interface MovementsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: RawMaterial | null
}

export function MovementsDialog({
  open,
  onOpenChange,
  material,
}: MovementsDialogProps) {
  const [movements, setMovements] = useState<RawMaterialMovement[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (open && material) {
      fetchMovements()
    }
  }, [open, material])

  const fetchMovements = async () => {
    if (!material) return
    setLoading(true)

    const { data, error } = await supabase
      .from("raw_material_movements")
      .select("*, creator:users(full_name)")
      .eq("raw_material_id", material.id)
      .order("created_at", { ascending: false })

    if (!error && data) {
      setMovements(data as unknown as RawMaterialMovement[])
    }
    setLoading(false)
  }

  if (!material) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Historial de movimientos</DialogTitle>
          <DialogDescription>
            {material.name} — Stock actual: {material.stock} {material.unit}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : movements.length === 0 ? (
            <EmptyState
              title="Sin movimientos"
              description="Este material no tiene movimientos registrados."
              className="py-12"
            />
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-cream hover:bg-cream">
                    <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                      Fecha
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                      Tipo
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground text-right">
                      Cantidad
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground text-center">
                      Stock
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                      Notas
                    </TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground hidden md:table-cell">
                      Usuario
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((mov) => {
                    const config = MOVEMENT_CONFIG[mov.movement_type] || MOVEMENT_CONFIG.entry
                    const isPositive = mov.quantity > 0
                    return (
                      <TableRow key={mov.id} className="hover:bg-cream-dark/50 transition-colors">
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateShort(mov.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("text-xs font-medium", config.color)}
                          >
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              "text-sm font-semibold tabular-nums",
                              mov.movement_type === "entry" || mov.movement_type === "return"
                                ? "text-success"
                                : mov.movement_type === "exit"
                                ? "text-error"
                                : isPositive
                                ? "text-success"
                                : "text-error"
                            )}
                          >
                            {isPositive ? "+" : ""}
                            {mov.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {mov.previous_stock} → {mov.new_stock}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                          {mov.notes || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                          {(mov.creator as unknown as { full_name: string })?.full_name || "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
