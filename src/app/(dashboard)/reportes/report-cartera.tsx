"use client"

import { useMemo } from "react"
import {
  BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts"
import { StatCard } from "@/components/shared/stat-card"
import { formatCOP, formatDateShort } from "@/lib/format"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import type { AccountReceivable, AccountPayable, AccountStatus } from "@/lib/types"

/* eslint-disable @typescript-eslint/no-explicit-any */

type ARExpanded = AccountReceivable & {
  client?: { full_name: string }
  sale?: { invoice_number: string }
}

type APExpanded = AccountPayable & {
  supplier?: { name: string }
}

interface ReportCarteraProps {
  receivables: ARExpanded[]
  payables: APExpanded[]
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "13px",
}

function getDaysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000))
}

function getAgingBucket(days: number): string {
  if (days <= 30) return "0-30"
  if (days <= 60) return "31-60"
  if (days <= 90) return "61-90"
  return "90+"
}

export function ReportCartera({ receivables, payables }: ReportCarteraProps) {
  // KPIs
  const totalCxC = useMemo(() => receivables.reduce((s, r) => s + r.remaining_amount, 0), [receivables])
  const totalCxP = useMemo(() => payables.reduce((s, p) => s + p.remaining_amount, 0), [payables])
  const balanceNeto = totalCxC - totalCxP
  const cuentasVencidas = useMemo(() =>
    receivables.filter(r => r.status === "overdue").length + payables.filter(p => p.status === "overdue").length
  , [receivables, payables])

  // Aging buckets
  const agingData = useMemo(() => {
    const buckets = ["0-30", "31-60", "61-90", "90+"]
    const cxcMap = new Map<string, number>()
    const cxpMap = new Map<string, number>()

    for (const b of buckets) { cxcMap.set(b, 0); cxpMap.set(b, 0) }

    for (const r of receivables) {
      if (r.status === "paid") continue
      const days = getDaysOverdue(r.due_date)
      const bucket = getAgingBucket(days)
      cxcMap.set(bucket, (cxcMap.get(bucket) || 0) + r.remaining_amount)
    }
    for (const p of payables) {
      if (p.status === "paid") continue
      const days = getDaysOverdue(p.due_date)
      const bucket = getAgingBucket(days)
      cxpMap.set(bucket, (cxpMap.get(bucket) || 0) + p.remaining_amount)
    }

    return buckets.map(bucket => ({
      rango: `${bucket} dias`,
      CxC: cxcMap.get(bucket) || 0,
      CxP: cxpMap.get(bucket) || 0,
    }))
  }, [receivables, payables])

  return (
    <div className="space-y-6">
      {/* StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="CxC pendiente" value={totalCxC} icon="TrendingUp" format="currency" borderColor="warning" delay={0} />
        <StatCard label="CxP pendiente" value={totalCxP} icon="TrendingDown" format="currency" borderColor="error" delay={1} />
        <StatCard label="Balance neto" value={balanceNeto} icon="DollarSign" format="currency" borderColor="gold" delay={2} />
        <StatCard label="Cuentas vencidas" value={cuentasVencidas} icon="Package" format="number" borderColor="error" delay={3} />
      </div>

      {/* Aging Chart */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <h3 className="text-base font-semibold mb-4">Envejecimiento de cartera (aging)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={agingData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="rango" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCOP(Number(v))} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="CxC" fill="#C9A55C" radius={[4, 4, 0, 0]} name="CxC (por cobrar)" />
            <Bar dataKey="CxP" fill="#EF4444" radius={[4, 4, 0, 0]} name="CxP (por pagar)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla CxC */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-cream">
          <h3 className="text-sm font-semibold">Cuentas por Cobrar (CxC)</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-cream hover:bg-cream">
                <TableHead className="text-xs font-semibold text-muted-foreground">Cliente</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Factura</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right hidden sm:table-cell">Total</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right hidden sm:table-cell">Pagado</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right">Pendiente</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Vencimiento</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Estado</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right hidden lg:table-cell">Dias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receivables.map((r) => {
                const dias = getDaysOverdue(r.due_date)
                return (
                  <TableRow key={r.id} className="hover:bg-cream-dark/50 transition-colors">
                    <TableCell className="text-sm font-medium">{r.client?.full_name || "—"}</TableCell>
                    <TableCell className="text-sm text-gold hidden md:table-cell">{r.sale?.invoice_number || "—"}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums hidden sm:table-cell">{formatCOP(r.total_amount)}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums hidden sm:table-cell">{formatCOP(r.paid_amount)}</TableCell>
                    <TableCell className="text-sm font-semibold text-right tabular-nums">{formatCOP(r.remaining_amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{r.due_date ? formatDateShort(r.due_date) : "—"}</TableCell>
                    <TableCell><StatusBadge status={r.status as AccountStatus} /></TableCell>
                    <TableCell className="text-sm text-right tabular-nums hidden lg:table-cell">{dias > 0 ? dias : "—"}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-cream text-xs text-muted-foreground flex justify-between">
          <span>{receivables.length} cuenta{receivables.length !== 1 ? "s" : ""}</span>
          <span className="font-semibold text-foreground">{formatCOP(totalCxC)}</span>
        </div>
      </div>

      {/* Tabla CxP */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-cream">
          <h3 className="text-sm font-semibold">Cuentas por Pagar (CxP)</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-cream hover:bg-cream">
                <TableHead className="text-xs font-semibold text-muted-foreground">Proveedor</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Concepto</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right hidden sm:table-cell">Total</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right hidden sm:table-cell">Pagado</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right">Pendiente</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Vencimiento</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Estado</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right hidden lg:table-cell">Dias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payables.map((p) => {
                const dias = getDaysOverdue(p.due_date)
                return (
                  <TableRow key={p.id} className="hover:bg-cream-dark/50 transition-colors">
                    <TableCell className="text-sm font-medium">{p.supplier?.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{p.notes || "—"}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums hidden sm:table-cell">{formatCOP(p.total_amount)}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums hidden sm:table-cell">{formatCOP(p.paid_amount)}</TableCell>
                    <TableCell className="text-sm font-semibold text-right tabular-nums">{formatCOP(p.remaining_amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{p.due_date ? formatDateShort(p.due_date) : "—"}</TableCell>
                    <TableCell><StatusBadge status={p.status as AccountStatus} /></TableCell>
                    <TableCell className="text-sm text-right tabular-nums hidden lg:table-cell">{dias > 0 ? dias : "—"}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-cream text-xs text-muted-foreground flex justify-between">
          <span>{payables.length} cuenta{payables.length !== 1 ? "s" : ""}</span>
          <span className="font-semibold text-foreground">{formatCOP(totalCxP)}</span>
        </div>
      </div>
    </div>
  )
}
