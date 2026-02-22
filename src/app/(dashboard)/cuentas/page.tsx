"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  ClipboardList,
  Search,
  CreditCard,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
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
import { formatCOP, formatDateShort } from "@/lib/format"
import { ACCOUNT_STATUS_LABELS } from "@/lib/constants"
import { PaymentDialog, type CxCExpanded, type CxPExpanded } from "./payment-dialog"

// ═══════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════
type TabKey = "por_cobrar" | "por_pagar"

// ═══════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════
export default function CuentasPage() {
  const supabase = createClient()

  // === Tab ===
  const [activeTab, setActiveTab] = useState<TabKey>("por_cobrar")

  // === Data ===
  const [receivables, setReceivables] = useState<CxCExpanded[]>([])
  const [payables, setPayables] = useState<CxPExpanded[]>([])
  const [loadingCxC, setLoadingCxC] = useState(true)
  const [loadingCxP, setLoadingCxP] = useState(true)

  // === Filters CxC ===
  const [searchCxC, setSearchCxC] = useState("")
  const [statusFilterCxC, setStatusFilterCxC] = useState("all")

  // === Filters CxP ===
  const [searchCxP, setSearchCxP] = useState("")
  const [statusFilterCxP, setStatusFilterCxP] = useState("all")

  // === Dialog ===
  const [showPayment, setShowPayment] = useState(false)
  const [paymentType, setPaymentType] = useState<"receivable" | "payable">("receivable")
  const [selectedCxC, setSelectedCxC] = useState<CxCExpanded | null>(null)
  const [selectedCxP, setSelectedCxP] = useState<CxPExpanded | null>(null)

  // ═══════════════════════════════════════════════════════════
  // Fetch CxC
  // ═══════════════════════════════════════════════════════════
  const fetchReceivables = useCallback(async () => {
    setLoadingCxC(true)

    const { data, error } = await supabase
      .from("accounts_receivable")
      .select(`
        *,
        client:clients(full_name),
        sale:sales(invoice_number)
      `)
      .order("created_at", { ascending: false })

    if (error) console.error("Error cargando CxC:", error)
    if (data) setReceivables(data as unknown as CxCExpanded[])
    setLoadingCxC(false)
  }, [supabase])

  // ═══════════════════════════════════════════════════════════
  // Fetch CxP
  // ═══════════════════════════════════════════════════════════
  const fetchPayables = useCallback(async () => {
    setLoadingCxP(true)

    const { data, error } = await supabase
      .from("accounts_payable")
      .select(`
        *,
        supplier:suppliers(name),
        expense:expenses(concept)
      `)
      .order("created_at", { ascending: false })

    if (error) console.error("Error cargando CxP:", error)
    if (data) setPayables(data as unknown as CxPExpanded[])
    setLoadingCxP(false)
  }, [supabase])

  // ═══════════════════════════════════════════════════════════
  // Effects
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    fetchReceivables()
    fetchPayables()
  }, [fetchReceivables, fetchPayables])

  // ═══════════════════════════════════════════════════════════
  // Filtered data
  // ═══════════════════════════════════════════════════════════
  const filteredCxC = useMemo(() => {
    return receivables.filter((r) => {
      if (searchCxC) {
        const q = searchCxC.toLowerCase()
        const matchClient = r.client?.full_name?.toLowerCase().includes(q)
        const matchInvoice = r.sale?.invoice_number?.toLowerCase().includes(q)
        if (!matchClient && !matchInvoice) return false
      }
      if (statusFilterCxC !== "all" && r.status !== statusFilterCxC) return false
      return true
    })
  }, [receivables, searchCxC, statusFilterCxC])

  const filteredCxP = useMemo(() => {
    return payables.filter((p) => {
      if (searchCxP) {
        const q = searchCxP.toLowerCase()
        const matchSupplier = p.supplier?.name?.toLowerCase().includes(q)
        const matchConcept = p.expense?.concept?.toLowerCase().includes(q)
        if (!matchSupplier && !matchConcept) return false
      }
      if (statusFilterCxP !== "all" && p.status !== statusFilterCxP) return false
      return true
    })
  }, [payables, searchCxP, statusFilterCxP])

  // ═══════════════════════════════════════════════════════════
  // Stats (memoizados)
  // ═══════════════════════════════════════════════════════════
  const { pendingCxC, pendingCxP, totalCxCPending, totalCxPPending } = useMemo(() => {
    const pendingCxC = receivables.filter((r) => r.status !== "paid")
    const pendingCxP = payables.filter((p) => p.status !== "paid")
    return {
      pendingCxC,
      pendingCxP,
      totalCxCPending: pendingCxC.reduce((s, r) => s + r.remaining_amount, 0),
      totalCxPPending: pendingCxP.reduce((s, p) => s + p.remaining_amount, 0),
    }
  }, [receivables, payables])

  // ═══════════════════════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════════════════════
  const handleAbonarCxC = (r: CxCExpanded) => {
    setSelectedCxC(r)
    setSelectedCxP(null)
    setPaymentType("receivable")
    setShowPayment(true)
  }

  const handleAbonarCxP = (p: CxPExpanded) => {
    setSelectedCxP(p)
    setSelectedCxC(null)
    setPaymentType("payable")
    setShowPayment(true)
  }

  const fetchAll = () => {
    fetchReceivables()
    fetchPayables()
  }

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Cuentas" description="Cuentas por cobrar y por pagar" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="CxC pendiente"
          value={totalCxCPending}
          icon="DollarSign"
          format="currency"
          borderColor="warning"
          delay={0}
        />
        <StatCard
          label="# CxC activas"
          value={pendingCxC.length}
          icon="Users"
          format="number"
          borderColor="gold"
          delay={1}
        />
        <StatCard
          label="CxP pendiente"
          value={totalCxPPending}
          icon="TrendingDown"
          format="currency"
          borderColor="error"
          delay={2}
        />
        <StatCard
          label="# CxP activas"
          value={pendingCxP.length}
          icon="ShoppingCart"
          format="number"
          borderColor="info"
          delay={3}
        />
      </div>

      {/* Balance neto */}
      {(totalCxCPending > 0 || totalCxPPending > 0) && (
        <div className="-mt-4 pl-1">
          <p className="text-xs text-muted-foreground">
            Balance neto:{" "}
            <span className={`font-semibold ${totalCxCPending - totalCxPPending >= 0 ? "text-success" : "text-error"}`}>
              {totalCxCPending - totalCxPPending >= 0 ? "+" : ""}{formatCOP(totalCxCPending - totalCxPPending)}
            </span>
            <span className="ml-1 text-muted-foreground">(nos deben − debemos)</span>
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("por_cobrar")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "por_cobrar"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Por Cobrar
          {pendingCxC.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-semibold">
              {pendingCxC.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("por_pagar")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "por_pagar"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Por Pagar
          {pendingCxP.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-error/10 text-error text-xs font-semibold">
              {pendingCxP.length}
            </span>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB: POR COBRAR (CxC)                                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "por_cobrar" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, factura..."
                value={searchCxC}
                onChange={(e) => setSearchCxC(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select value={statusFilterCxC} onValueChange={setStatusFilterCxC}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="partial">Parciales</SelectItem>
                <SelectItem value="paid">Pagadas</SelectItem>
                <SelectItem value="overdue">Vencidas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table CxC */}
          {loadingCxC ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredCxC.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Sin cuentas por cobrar"
              description="Las cuentas por cobrar se crean al registrar ventas a crédito."
            />
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-cream hover:bg-cream">
                    <TableHead className="text-xs font-semibold text-muted-foreground">Cliente</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[110px]">Factura</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[100px]">Total</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[100px]">Pagado</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[100px]">Pendiente</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[120px]">Progreso</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[90px]">Vence</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[90px]">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[70px] text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCxC.map((r) => {
                    const pct = r.total_amount > 0
                      ? Math.round((r.paid_amount / r.total_amount) * 100)
                      : 0
                    const isPaid = r.status === "paid"

                    return (
                      <TableRow key={r.id} className="hover:bg-muted/50">
                        <TableCell className="text-sm font-medium">
                          {r.client?.full_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.sale?.invoice_number || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums">
                          {formatCOP(r.total_amount)}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums text-success font-medium">
                          {formatCOP(r.paid_amount)}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums text-error font-medium">
                          {formatCOP(r.remaining_amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-border rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isPaid ? "bg-success" : "bg-gold"}`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                              {pct}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.due_date ? formatDateShort(r.due_date) : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={r.status as "pending" | "partial" | "paid" | "overdue"}
                            label={ACCOUNT_STATUS_LABELS[r.status] || r.status}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {!isPaid && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-gold hover:text-gold"
                              onClick={() => handleAbonarCxC(r)}
                              title="Registrar abono"
                            >
                              <CreditCard size={14} />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Footer CxC */}
          {filteredCxC.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
              <span>{filteredCxC.length} cuenta{filteredCxC.length !== 1 ? "s" : ""}</span>
              <span className="font-semibold text-warning">
                Pendiente: {formatCOP(
                  filteredCxC
                    .filter((r) => r.status !== "paid")
                    .reduce((s, r) => s + r.remaining_amount, 0)
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB: POR PAGAR (CxP)                                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "por_pagar" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar proveedor, concepto..."
                value={searchCxP}
                onChange={(e) => setSearchCxP(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select value={statusFilterCxP} onValueChange={setStatusFilterCxP}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="partial">Parciales</SelectItem>
                <SelectItem value="paid">Pagadas</SelectItem>
                <SelectItem value="overdue">Vencidas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table CxP */}
          {loadingCxP ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredCxP.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Sin cuentas por pagar"
              description="Las cuentas por pagar se crean al registrar un gasto con la opción activada."
            />
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-cream hover:bg-cream">
                    <TableHead className="text-xs font-semibold text-muted-foreground">Proveedor</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Concepto</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[100px]">Total</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[100px]">Pagado</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[100px]">Pendiente</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[120px]">Progreso</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[90px]">Vence</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[90px]">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[70px] text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCxP.map((p) => {
                    const pct = p.total_amount > 0
                      ? Math.round((p.paid_amount / p.total_amount) * 100)
                      : 0
                    const isPaid = p.status === "paid"

                    return (
                      <TableRow key={p.id} className="hover:bg-muted/50">
                        <TableCell className="text-sm font-medium">
                          {p.supplier?.name || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.expense?.concept || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums">
                          {formatCOP(p.total_amount)}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums text-success font-medium">
                          {formatCOP(p.paid_amount)}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums text-error font-medium">
                          {formatCOP(p.remaining_amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-border rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isPaid ? "bg-success" : "bg-gold"}`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                              {pct}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.due_date ? formatDateShort(p.due_date) : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={p.status as "pending" | "partial" | "paid" | "overdue"}
                            label={ACCOUNT_STATUS_LABELS[p.status] || p.status}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {!isPaid && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-gold hover:text-gold"
                              onClick={() => handleAbonarCxP(p)}
                              title="Registrar abono"
                            >
                              <CreditCard size={14} />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Footer CxP */}
          {filteredCxP.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
              <span>{filteredCxP.length} cuenta{filteredCxP.length !== 1 ? "s" : ""}</span>
              <span className="font-semibold text-error">
                Pendiente: {formatCOP(
                  filteredCxP
                    .filter((p) => p.status !== "paid")
                    .reduce((s, p) => s + p.remaining_amount, 0)
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DIALOG                                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <PaymentDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        type={paymentType}
        receivable={selectedCxC}
        payable={selectedCxP}
        onCompleted={fetchAll}
      />
    </div>
  )
}
