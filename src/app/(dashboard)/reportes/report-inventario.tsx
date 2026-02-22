"use client"

import { useMemo } from "react"
import {
  BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import { StatCard } from "@/components/shared/stat-card"
import { formatCOP } from "@/lib/format"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import type { ProductVariant, Product, RawMaterial } from "@/lib/types"

/* eslint-disable @typescript-eslint/no-explicit-any */

type VariantExpanded = ProductVariant & {
  product?: Product
}

interface ReportInventarioProps {
  variants: VariantExpanded[]
  rawMaterials: RawMaterial[]
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "13px",
}

function EmptyChart() {
  return (
    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
      Sin datos disponibles
    </div>
  )
}

export function ReportInventario({ variants, rawMaterials }: ReportInventarioProps) {
  // KPIs
  const valorProductos = useMemo(() =>
    variants.reduce((s, v) => s + v.stock * v.cost_per_unit, 0)
  , [variants])

  const productosActivos = useMemo(() => {
    const productIds = new Set(variants.filter(v => v.is_active).map(v => v.product_id))
    return productIds.size
  }, [variants])

  const valorMateriasPrimas = useMemo(() =>
    rawMaterials.reduce((s, rm) => s + rm.stock * rm.cost_per_unit, 0)
  , [rawMaterials])

  const stockBajo = useMemo(() =>
    variants.filter(v => v.is_active && v.stock <= v.min_stock_alert).length
    + rawMaterials.filter(rm => rm.is_active && rm.stock <= rm.min_stock_alert).length
  , [variants, rawMaterials])

  // Valor por categoria de producto (top 8)
  const valueByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of variants) {
      const cat = v.product?.category || "Otros"
      map.set(cat, (map.get(cat) || 0) + v.stock * v.cost_per_unit)
    }
    return Array.from(map.entries())
      .map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8)
  }, [variants])

  return (
    <div className="space-y-6">
      {/* StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Valor inventario" value={valorProductos} icon="DollarSign" format="currency" borderColor="gold" delay={0} />
        <StatCard label="Productos activos" value={productosActivos} icon="Package" format="number" borderColor="success" delay={1} />
        <StatCard label="Valor materias primas" value={valorMateriasPrimas} icon="Wallet" format="currency" borderColor="info" delay={2} />
        <StatCard label="Items stock bajo" value={stockBajo} icon="TrendingDown" format="number" borderColor="warning" delay={3} />
      </div>

      {/* Chart — Valor por categoria */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h3 className="text-base font-semibold mb-4">Valor de inventario por categoria</h3>
        {valueByCategory.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(220, valueByCategory.length * 36)}>
            <BarChart data={valueByCategory} layout="vertical" barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <YAxis type="category" dataKey="categoria" width={120} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCOP(Number(v))} />
              <Bar dataKey="valor" fill="#C9A55C" radius={[0, 4, 4, 0]} name="Valor" />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>

      {/* Tabla Productos */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-cream">
          <h3 className="text-sm font-semibold">Inventario de Productos</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-cream hover:bg-cream">
                <TableHead className="text-xs font-semibold text-muted-foreground">Producto</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Variante</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden lg:table-cell">Categoria</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right">Stock</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right hidden sm:table-cell">Costo unit.</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right">Valor total</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((v) => {
                const valor = v.stock * v.cost_per_unit
                const isLow = v.stock <= v.min_stock_alert
                return (
                  <TableRow key={v.id} className="hover:bg-cream-dark/50 transition-colors">
                    <TableCell className="text-sm font-medium">{v.product?.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{v.color} / {v.size}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{v.product?.category || "—"}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">
                      <span className={isLow ? "text-error font-semibold" : ""}>{v.stock}</span>
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums hidden sm:table-cell">{formatCOP(v.cost_per_unit)}</TableCell>
                    <TableCell className="text-sm font-semibold text-right tabular-nums">{formatCOP(valor)}</TableCell>
                    <TableCell className="hidden md:table-cell text-center">
                      {isLow ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-error/10 text-error border border-error/20">Bajo</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">OK</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-cream text-xs text-muted-foreground flex justify-between">
          <span>{variants.length} variante{variants.length !== 1 ? "s" : ""}</span>
          <span className="font-semibold text-foreground">{formatCOP(valorProductos)}</span>
        </div>
      </div>

      {/* Tabla Materias Primas */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-cream">
          <h3 className="text-sm font-semibold">Materias Primas</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-cream hover:bg-cream">
                <TableHead className="text-xs font-semibold text-muted-foreground">Material</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Categoria</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right">Stock</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden sm:table-cell">Unidad</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right hidden sm:table-cell">Costo unit.</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right">Valor total</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rawMaterials.map((rm) => {
                const valor = rm.stock * rm.cost_per_unit
                const isLow = rm.stock <= rm.min_stock_alert
                return (
                  <TableRow key={rm.id} className="hover:bg-cream-dark/50 transition-colors">
                    <TableCell className="text-sm font-medium">{rm.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{rm.category}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">
                      <span className={isLow ? "text-error font-semibold" : ""}>{rm.stock}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{rm.unit}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums hidden sm:table-cell">{formatCOP(rm.cost_per_unit)}</TableCell>
                    <TableCell className="text-sm font-semibold text-right tabular-nums">{formatCOP(valor)}</TableCell>
                    <TableCell className="hidden md:table-cell text-center">
                      {isLow ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-error/10 text-error border border-error/20">Bajo</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">OK</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-cream text-xs text-muted-foreground flex justify-between">
          <span>{rawMaterials.length} material{rawMaterials.length !== 1 ? "es" : ""}</span>
          <span className="font-semibold text-foreground">{formatCOP(valorMateriasPrimas)}</span>
        </div>
      </div>
    </div>
  )
}
