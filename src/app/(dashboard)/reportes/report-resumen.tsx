"use client"

import { useMemo } from "react"
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import { StatCard } from "@/components/shared/stat-card"
import { formatCOP, formatDateShort } from "@/lib/format"
import { SALE_CHANNELS, PAYMENT_METHODS } from "@/lib/constants"
import type { Sale, SaleItem, ProductVariant, Expense, Campaign, PartnerWithdrawal, Subscription, AccountReceivable, AccountPayable } from "@/lib/types"

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ReportResumenProps {
  sales: (Sale & { items?: (SaleItem & { variant?: ProductVariant })[] })[]
  expenses: (Expense & { category?: { name: string } })[]
  campaigns: Campaign[]
  withdrawals: PartnerWithdrawal[]
  subscriptions: Subscription[]
  receivables: AccountReceivable[]
  payables: AccountPayable[]
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

export function ReportResumen({
  sales, expenses, campaigns, withdrawals, subscriptions,
  receivables, payables,
}: ReportResumenProps) {
  const activeSales = useMemo(() => sales.filter(s => s.status !== "returned"), [sales])

  // KPIs
  const ventasBrutas = useMemo(() => activeSales.reduce((s, v) => s + v.total, 0), [activeSales])
  const costoVentas = useMemo(() =>
    activeSales.reduce((s, v) =>
      s + (v.items || []).reduce((q, i) => q + i.quantity * (i.variant?.cost_per_unit || 0), 0)
    , 0), [activeSales])
  const gananciaBruta = ventasBrutas - costoVentas
  const gastosOperativos = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])
  const gananciaNeta = gananciaBruta - gastosOperativos
  const margenNeto = ventasBrutas > 0 ? (gananciaNeta / ventasBrutas) * 100 : 0

  // Chart 1 — Ventas vs Gastos por dia
  const dailyComparison = useMemo(() => {
    const map = new Map<string, { ventas: number; gastos: number }>()
    for (const s of activeSales) {
      const d = (s.sale_date || s.created_at).split("T")[0]
      const entry = map.get(d) || { ventas: 0, gastos: 0 }
      entry.ventas += s.total
      map.set(d, entry)
    }
    for (const e of expenses) {
      const d = (e.expense_date || e.created_at).split("T")[0]
      const entry = map.get(d) || { ventas: 0, gastos: 0 }
      entry.gastos += e.amount
      map.set(d, entry)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, v]) => ({ fecha: formatDateShort(d), ventas: v.ventas, gastos: v.gastos }))
  }, [activeSales, expenses])

  // Chart 2 — Gastos por categoria top 5
  const gastosByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      const cat = e.category?.name || "Otros"
      map.set(cat, (map.get(cat) || 0) + e.amount)
    }
    return Array.from(map.entries())
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [expenses])

  // Chart 3 — Ventas por canal
  const salesByChannel = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of activeSales) {
      const label = SALE_CHANNELS.find(c => c.value === s.sale_channel)?.label || s.sale_channel
      map.set(label, (map.get(label) || 0) + s.total)
    }
    return Array.from(map.entries())
      .map(([canal, total]) => ({ canal, total }))
      .sort((a, b) => b.total - a.total)
  }, [activeSales])

  // Mini KPIs
  const totalCxC = useMemo(() => receivables.reduce((s, r) => s + r.remaining_amount, 0), [receivables])
  const totalCxP = useMemo(() => payables.reduce((s, p) => s + p.remaining_amount, 0), [payables])
  const ticketPromedio = activeSales.length > 0 ? Math.round(ventasBrutas / activeSales.length) : 0
  const costoSuscripciones = useMemo(() => subscriptions.filter(s => s.status === "active").reduce((s, sub) => s + sub.monthly_cost, 0), [subscriptions])
  const roiPromedio = useMemo(() => {
    const withRoi = campaigns.filter(c => c.roi !== null && c.roi !== undefined)
    return withRoi.length > 0 ? withRoi.reduce((s, c) => s + (c.roi || 0), 0) / withRoi.length : null
  }, [campaigns])
  const totalRetiros = useMemo(() => withdrawals.reduce((s, w) => s + w.amount, 0), [withdrawals])

  return (
    <div className="space-y-6">
      {/* StatCards P&L */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Ventas brutas" value={ventasBrutas} icon="DollarSign" format="currency" borderColor="gold" delay={0} />
        <StatCard label="Costo de venta" value={costoVentas} icon="Package" format="currency" borderColor="warning" delay={1} />
        <StatCard label="Ganancia bruta" value={gananciaBruta} icon="TrendingUp" format="currency" borderColor="success" delay={2} />
        <StatCard label="Gastos operativos" value={gastosOperativos} icon="TrendingDown" format="currency" borderColor="error" delay={3} />
        <StatCard label="Ganancia neta" value={gananciaNeta} icon="DollarSign" format="currency" borderColor={gananciaNeta >= 0 ? "success" : "error"} delay={4} />
        <StatCard label="Margen neto" value={Math.round(margenNeto * 10) / 10} icon="TrendingUp" format="number" borderColor="info" delay={5} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ventas vs Gastos diario */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-card lg:col-span-2">
          <h3 className="text-base font-semibold mb-4">Ventas vs Gastos por dia</h3>
          {dailyComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCOP(Number(v))} />
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A55C" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C9A55C" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="ventas" stroke="#C9A55C" strokeWidth={2} fill="url(#goldGrad)" name="Ventas" />
                <Area type="monotone" dataKey="gastos" stroke="#EF4444" strokeWidth={2} fill="url(#redGrad)" name="Gastos" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Gastos por categoria */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h3 className="text-base font-semibold mb-4">Gastos por categoria (Top 5)</h3>
          {gastosByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={gastosByCategory} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <YAxis type="category" dataKey="categoria" width={120} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCOP(Number(v))} />
                <Bar dataKey="total" fill="#EF4444" radius={[0, 4, 4, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Ventas por canal */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h3 className="text-base font-semibold mb-4">Ventas por canal</h3>
          {salesByChannel.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={salesByChannel} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <YAxis type="category" dataKey="canal" width={100} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCOP(Number(v))} />
                <Bar dataKey="total" fill="#C9A55C" radius={[0, 4, 4, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Mini KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Facturas emitidas", value: activeSales.length },
          { label: "Gastos registrados", value: expenses.length },
          { label: "Ticket promedio", value: ticketPromedio, isCOP: true },
          { label: "Suscripciones/mes", value: costoSuscripciones, isCOP: true },
          { label: "CxC pendiente", value: totalCxC, isCOP: true },
          { label: "CxP pendiente", value: totalCxP, isCOP: true },
          { label: "ROI campanas", value: roiPromedio !== null ? `${roiPromedio.toFixed(1)}%` : "—" },
          { label: "Retiros socios", value: totalRetiros, isCOP: true },
        ].map((item) => (
          <div key={item.label} className="bg-card rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className="text-lg font-semibold font-[family-name:var(--font-display)] tabular-nums">
              {typeof item.value === "string" ? item.value
                : (item as any).isCOP ? formatCOP(item.value as number)
                : item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
