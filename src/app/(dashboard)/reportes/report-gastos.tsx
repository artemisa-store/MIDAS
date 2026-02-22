"use client"

import { useMemo } from "react"
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import { StatCard } from "@/components/shared/stat-card"
import { formatCOP, formatDateShort } from "@/lib/format"
import { PAYMENT_METHODS } from "@/lib/constants"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import type { Expense, ExpenseCategory, Supplier } from "@/lib/types"

/* eslint-disable @typescript-eslint/no-explicit-any */

type ExpenseExpanded = Expense & {
  category?: ExpenseCategory
  supplier?: Supplier
}

interface ReportGastosProps {
  expenses: ExpenseExpanded[]
  from: string
  to: string
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
      Sin datos para el periodo seleccionado
    </div>
  )
}

export function ReportGastos({ expenses }: ReportGastosProps) {
  // KPIs
  const totalGastos = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])
  const promedioGasto = expenses.length > 0 ? Math.round(totalGastos / expenses.length) : 0

  // Top categoria
  const topCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      const cat = e.category?.name || "Otros"
      map.set(cat, (map.get(cat) || 0) + e.amount)
    }
    let max = ""
    let maxVal = 0
    for (const [cat, val] of map) {
      if (val > maxVal) { max = cat; maxVal = val }
    }
    return max || "—"
  }, [expenses])

  // Gastos por categoria
  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      const cat = e.category?.name || "Otros"
      map.set(cat, (map.get(cat) || 0) + e.amount)
    }
    return Array.from(map.entries())
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total)
  }, [expenses])

  // Tendencia diaria
  const dailyTrend = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      const d = (e.expense_date || e.created_at).split("T")[0]
      map.set(d, (map.get(d) || 0) + e.amount)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, total]) => ({ fecha: formatDateShort(d), total }))
  }, [expenses])

  return (
    <div className="space-y-6">
      {/* StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total gastos" value={totalGastos} icon="TrendingDown" format="currency" borderColor="error" delay={0} />
        <StatCard label="Registros" value={expenses.length} icon="DollarSign" format="number" borderColor="gold" delay={1} />
        <StatCard label="Promedio por gasto" value={promedioGasto} icon="Wallet" format="currency" borderColor="info" delay={2} />
        <div className="bg-card rounded-lg border border-border border-l-[3px] border-l-warning p-5 flex flex-col justify-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-2">Top categoria</p>
          <p className="text-lg font-[family-name:var(--font-display)] font-bold truncate">{topCategory}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gastos por categoria */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h3 className="text-base font-semibold mb-4">Gastos por categoria</h3>
          {byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(220, byCategory.length * 36)}>
              <BarChart data={byCategory} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <YAxis type="category" dataKey="categoria" width={140} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCOP(Number(v))} />
                <Bar dataKey="total" fill="#EF4444" radius={[0, 4, 4, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Tendencia diaria */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h3 className="text-base font-semibold mb-4">Tendencia diaria de gastos</h3>
          {dailyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCOP(Number(v))} />
                <defs>
                  <linearGradient id="redGradG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="total" stroke="#EF4444" strokeWidth={2} fill="url(#redGradG)" name="Gastos" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Tabla detalle */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-cream hover:bg-cream">
                <TableHead className="text-xs font-semibold text-muted-foreground">Fecha</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Concepto</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Categoria</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden lg:table-cell">Proveedor</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden sm:table-cell">M. Pago</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => {
                const pmLabel = PAYMENT_METHODS.find(m => m.value === e.payment_method)?.label || e.payment_method
                return (
                  <TableRow key={e.id} className="hover:bg-cream-dark/50 transition-colors">
                    <TableCell className="text-sm">{formatDateShort(e.expense_date || e.created_at)}</TableCell>
                    <TableCell className="text-sm font-medium">{e.concept}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{e.category?.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{e.supplier?.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{pmLabel}</TableCell>
                    <TableCell className="text-sm font-semibold text-right tabular-nums">{formatCOP(e.amount)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-cream text-xs text-muted-foreground flex justify-between">
          <span>{expenses.length} gasto{expenses.length !== 1 ? "s" : ""}</span>
          <span className="font-semibold text-foreground">{formatCOP(totalGastos)}</span>
        </div>
      </div>
    </div>
  )
}
