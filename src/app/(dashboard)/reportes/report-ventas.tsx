"use client"

import { useMemo } from "react"
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import { StatCard } from "@/components/shared/stat-card"
import { formatCOP, formatDateShort } from "@/lib/format"
import { SALE_CHANNELS, PAYMENT_METHODS, SALE_STATUS_CONFIG } from "@/lib/constants"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/status-badge"
import type { Sale, SaleItem, ProductVariant, Client, SaleStatus } from "@/lib/types"

/* eslint-disable @typescript-eslint/no-explicit-any */

type SaleExpanded = Sale & {
  items?: (SaleItem & { variant?: ProductVariant & { product?: { name: string; category: string } } })[]
  client?: Client
}

interface ReportVentasProps {
  sales: SaleExpanded[]
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

export function ReportVentas({ sales }: ReportVentasProps) {
  const activeSales = useMemo(() => sales.filter(s => s.status !== "returned"), [sales])

  // KPIs
  const totalVendido = useMemo(() => activeSales.reduce((s, v) => s + v.total, 0), [activeSales])
  const totalUnidades = useMemo(() =>
    activeSales.reduce((s, v) => s + (v.items || []).reduce((q, i) => q + i.quantity, 0), 0)
  , [activeSales])
  const ticketPromedio = activeSales.length > 0 ? Math.round(totalVendido / activeSales.length) : 0

  // Tendencia diaria
  const dailyTrend = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of activeSales) {
      const d = (s.sale_date || s.created_at).split("T")[0]
      map.set(d, (map.get(d) || 0) + s.total)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, total]) => ({ fecha: formatDateShort(d), total }))
  }, [activeSales])

  // Ventas por canal
  const byChannel = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of activeSales) {
      const label = SALE_CHANNELS.find(c => c.value === s.sale_channel)?.label || s.sale_channel
      map.set(label, (map.get(label) || 0) + s.total)
    }
    return Array.from(map.entries())
      .map(([canal, total]) => ({ canal, total }))
      .sort((a, b) => b.total - a.total)
  }, [activeSales])

  // Top 10 productos
  const topProducts = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of activeSales) {
      for (const item of s.items || []) {
        const name = item.variant?.product?.name || "Producto"
        map.set(name, (map.get(name) || 0) + item.quantity)
      }
    }
    return Array.from(map.entries())
      .map(([producto, cantidad]) => ({ producto, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10)
  }, [activeSales])

  // Top 10 clientes
  const topClients = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of activeSales) {
      const name = s.client?.full_name || "Sin cliente"
      map.set(name, (map.get(name) || 0) + s.total)
    }
    return Array.from(map.entries())
      .map(([cliente, total]) => ({ cliente, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
  }, [activeSales])

  return (
    <div className="space-y-6">
      {/* StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total vendido" value={totalVendido} icon="DollarSign" format="currency" borderColor="gold" delay={0} />
        <StatCard label="Facturas" value={activeSales.length} icon="ShoppingCart" format="number" borderColor="success" delay={1} />
        <StatCard label="Ticket promedio" value={ticketPromedio} icon="Wallet" format="currency" borderColor="info" delay={2} />
        <StatCard label="Unidades vendidas" value={totalUnidades} icon="Package" format="number" borderColor="warning" delay={3} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tendencia diaria */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-card lg:col-span-2">
          <h3 className="text-base font-semibold mb-4">Tendencia diaria de ventas</h3>
          {dailyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCOP(Number(v))} />
                <defs>
                  <linearGradient id="goldGradV" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A55C" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C9A55C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="total" stroke="#C9A55C" strokeWidth={2} fill="url(#goldGradV)" name="Ventas" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Por canal */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h3 className="text-base font-semibold mb-4">Ventas por canal</h3>
          {byChannel.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byChannel} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <YAxis type="category" dataKey="canal" width={100} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCOP(Number(v))} />
                <Bar dataKey="total" fill="#C9A55C" radius={[0, 4, 4, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Top 10 productos */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h3 className="text-base font-semibold mb-4">Top 10 productos (unidades)</h3>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(220, topProducts.length * 32)}>
              <BarChart data={topProducts} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis type="category" dataKey="producto" width={130} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${v} und.`} />
                <Bar dataKey="cantidad" fill="#C9A55C" radius={[0, 4, 4, 0]} name="Unidades" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Top 10 clientes */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-card lg:col-span-2">
          <h3 className="text-base font-semibold mb-4">Top 10 clientes por monto</h3>
          {topClients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {topClients.map((c, i) => (
                <div key={c.cliente} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-cream transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-semibold text-xs">{i + 1}</div>
                    <span className="text-sm font-medium truncate">{c.cliente}</span>
                  </div>
                  <span className="text-sm font-semibold text-gold tabular-nums shrink-0 ml-2">{formatCOP(c.total)}</span>
                </div>
              ))}
            </div>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Tabla detalle */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-cream hover:bg-cream">
                <TableHead className="text-xs font-semibold text-muted-foreground">Factura</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Fecha</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Cliente</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden lg:table-cell">Canal</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden lg:table-cell">M. Pago</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Estado</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right hidden sm:table-cell">Uds</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => {
                const chLabel = SALE_CHANNELS.find(c => c.value === s.sale_channel)?.label || s.sale_channel
                const pmLabel = PAYMENT_METHODS.find(m => m.value === s.payment_method)?.label || s.payment_method
                const uds = (s.items || []).reduce((q, i) => q + i.quantity, 0)
                return (
                  <TableRow key={s.id} className="hover:bg-cream-dark/50 transition-colors">
                    <TableCell className="text-sm font-medium text-gold">{s.invoice_number}</TableCell>
                    <TableCell className="text-sm">{formatDateShort(s.sale_date || s.created_at)}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{s.client?.full_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{chLabel}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{pmLabel}</TableCell>
                    <TableCell><StatusBadge status={s.status as SaleStatus} /></TableCell>
                    <TableCell className="text-sm text-right tabular-nums hidden sm:table-cell">{uds}</TableCell>
                    <TableCell className="text-sm font-semibold text-right tabular-nums">{formatCOP(s.total)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-cream text-xs text-muted-foreground flex justify-between">
          <span>{sales.length} venta{sales.length !== 1 ? "s" : ""}</span>
          <span className="font-semibold text-foreground">{formatCOP(totalVendido)}</span>
        </div>
      </div>
    </div>
  )
}
