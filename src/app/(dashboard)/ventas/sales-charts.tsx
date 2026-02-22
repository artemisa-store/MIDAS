"use client"

import { useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts"
import { formatCOP, formatDateShort } from "@/lib/format"
import { SALE_CHANNELS } from "@/lib/constants"
import type { SaleExpanded } from "../facturacion/recibo-termico"

interface SalesChartsProps {
  sales: SaleExpanded[]
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "13px",
}

function EmptyChartPlaceholder() {
  return (
    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
      Sin datos para el periodo seleccionado
    </div>
  )
}

export function SalesCharts({ sales }: SalesChartsProps) {
  const activeSales = useMemo(() => sales.filter((s) => s.status !== "returned"), [sales])

  // Ventas por canal
  const salesByChannel = useMemo(() => {
    const map = new Map<string, number>()
    for (const sale of activeSales) {
      const label =
        SALE_CHANNELS.find((c) => c.value === sale.sale_channel)?.label || sale.sale_channel
      map.set(label, (map.get(label) || 0) + sale.total)
    }
    return Array.from(map.entries())
      .map(([canal, total]) => ({ canal, total }))
      .sort((a, b) => b.total - a.total)
  }, [activeSales])

  // Top 5 productos vendidos
  const topProducts = useMemo(() => {
    const map = new Map<string, number>()
    for (const sale of activeSales) {
      for (const item of sale.items || []) {
        const name = item.variant?.product?.name || "Producto"
        map.set(name, (map.get(name) || 0) + item.quantity)
      }
    }
    return Array.from(map.entries())
      .map(([producto, cantidad]) => ({ producto, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)
  }, [activeSales])

  // Top 5 clientes
  const topClients = useMemo(() => {
    const map = new Map<string, number>()
    for (const sale of activeSales) {
      const name = sale.client?.full_name || "Sin cliente"
      map.set(name, (map.get(name) || 0) + sale.total)
    }
    return Array.from(map.entries())
      .map(([cliente, total]) => ({ cliente, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [activeSales])

  // Tendencia diaria
  const dailyTrend = useMemo(() => {
    const map = new Map<string, number>()
    for (const sale of activeSales) {
      const dateKey = (sale.sale_date || sale.created_at).split("T")[0]
      map.set(dateKey, (map.get(dateKey) || 0) + sale.total)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, total]) => ({
        fecha: formatDateShort(dateKey),
        total,
      }))
  }, [activeSales])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      {/* Ventas por canal */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h3 className="text-base font-semibold mb-4">Ventas por canal</h3>
        {salesByChannel.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salesByChannel} layout="vertical" barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              />
              <YAxis
                type="category"
                dataKey="canal"
                width={100}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCOP(Number(v))} />
              <Bar dataKey="total" fill="#C9A55C" radius={[0, 4, 4, 0]} name="Total" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartPlaceholder />
        )}
      </div>

      {/* Top 5 productos */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h3 className="text-base font-semibold mb-4">Top 5 productos</h3>
        {topProducts.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProducts} layout="vertical" barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                type="category"
                dataKey="producto"
                width={120}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v} und.`} />
              <Bar dataKey="cantidad" fill="#C9A55C" radius={[0, 4, 4, 0]} name="Unidades" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartPlaceholder />
        )}
      </div>

      {/* Top 5 clientes */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h3 className="text-base font-semibold mb-4">Top 5 clientes</h3>
        {topClients.length > 0 ? (
          <div className="space-y-3">
            {topClients.map((client, i) => (
              <div
                key={client.cliente}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-cream transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-semibold text-xs">
                    {i + 1}
                  </div>
                  <span className="text-sm font-medium truncate">{client.cliente}</span>
                </div>
                <span className="text-sm font-semibold text-gold tabular-nums shrink-0 ml-2">
                  {formatCOP(client.total)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyChartPlaceholder />
        )}
      </div>

      {/* Tendencia diaria */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h3 className="text-base font-semibold mb-4">Tendencia diaria</h3>
        {dailyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCOP(Number(v))} />
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A55C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C9A55C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="total"
                stroke="#C9A55C"
                strokeWidth={2}
                fill="url(#goldGradient)"
                name="Ventas"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartPlaceholder />
        )}
      </div>
    </div>
  )
}
