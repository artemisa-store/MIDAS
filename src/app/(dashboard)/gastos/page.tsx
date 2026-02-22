"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Search,
  Plus,
  Download,
  Pencil,
  Trash2,
  CreditCard,
} from "lucide-react"
import { toast } from "sonner"
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
import { PAYMENT_METHODS } from "@/lib/constants"
import { type PeriodKey, PERIODS, toLocalDate, getDateRange } from "@/lib/date-periods"
import type { Expense, ExpenseCategory } from "@/lib/types"
import { PeriodSelector } from "@/components/shared/period-selector"
import { ExpenseFormDialog } from "./expense-form-dialog"
import { APPaymentDialog, type AccountPayableExpanded } from "./ap-payment-dialog"
import { exportExpensesToExcel, type ExpenseForExport } from "./export-expenses"

// ═══════════════════════════════════════════════════════════
// Tabs
// ═══════════════════════════════════════════════════════════
type TabKey = "gastos" | "cuentas_por_pagar"

// ═══════════════════════════════════════════════════════════
// Expanded types (con joins)
// ═══════════════════════════════════════════════════════════
type ExpenseExpanded = Omit<Expense, "category" | "supplier"> & {
  category?: ExpenseCategory
  supplier?: { name: string }
}

// ═══════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════
export default function GastosPage() {
  const supabase = createClient()

  // === Tab ===
  const [activeTab, setActiveTab] = useState<TabKey>("gastos")

  // === Periodo ===
  const [period, setPeriod] = useState<PeriodKey>("month")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")

  // === Data ===
  const [expenses, setExpenses] = useState<ExpenseExpanded[]>([])
  const [accounts, setAccounts] = useState<AccountPayableExpanded[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(true)
  const [loadingAccounts, setLoadingAccounts] = useState(true)

  // === Filtros gastos ===
  const [searchExpense, setSearchExpense] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all")

  // === Filtros AP ===
  const [searchAP, setSearchAP] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // === Dialogs ===
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [showAPPayment, setShowAPPayment] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<AccountPayableExpanded | null>(null)

  // === AP stats ===
  const [apPendingTotal, setApPendingTotal] = useState(0)

  // ═══════════════════════════════════════════════════════════
  // Fetch categories
  // ═══════════════════════════════════════════════════════════
  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
    if (data) setCategories(data as ExpenseCategory[])
  }, [supabase])

  // ═══════════════════════════════════════════════════════════
  // Fetch expenses
  // ═══════════════════════════════════════════════════════════
  const fetchExpenses = useCallback(async () => {
    setLoadingExpenses(true)

    let dateFrom: string
    let dateTo: string

    if (period === "custom") {
      dateFrom = customFrom || ""
      if (customTo) {
        const nextDay = new Date(customTo + "T00:00:00")
        nextDay.setDate(nextDay.getDate() + 1)
        dateTo = toLocalDate(nextDay)
      } else {
        dateTo = ""
      }
    } else {
      const range = getDateRange(period)
      dateFrom = range.from
      dateTo = range.to
    }

    let query = supabase
      .from("expenses")
      .select(`
        *,
        category:expense_categories(*),
        supplier:suppliers(name)
      `)
      .order("expense_date", { ascending: false })

    if (dateFrom) query = query.gte("expense_date", dateFrom)
    if (dateTo) query = query.lt("expense_date", dateTo)

    const { data, error } = await query

    if (!error && data) {
      setExpenses(data as unknown as ExpenseExpanded[])
    }

    setLoadingExpenses(false)
  }, [supabase, period, customFrom, customTo])

  // ═══════════════════════════════════════════════════════════
  // Fetch accounts payable
  // ═══════════════════════════════════════════════════════════
  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true)

    const { data } = await supabase
      .from("accounts_payable")
      .select(`
        *,
        supplier:suppliers(name),
        expense:expenses(concept)
      `)
      .order("created_at", { ascending: false })

    if (data) {
      setAccounts(data as unknown as AccountPayableExpanded[])

      // Calcular total pendiente
      const pending = (data as unknown as AccountPayableExpanded[])
        .filter((a) => a.status !== "paid")
        .reduce((s, a) => s + a.remaining_amount, 0)
      setApPendingTotal(pending)
    }

    setLoadingAccounts(false)
  }, [supabase])

  // ═══════════════════════════════════════════════════════════
  // Effects
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    fetchCategories()
    fetchAccounts()
  }, [fetchCategories, fetchAccounts])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  // ═══════════════════════════════════════════════════════════
  // Filtered data
  // ═══════════════════════════════════════════════════════════
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (searchExpense) {
        const q = searchExpense.toLowerCase()
        const matchConcept = exp.concept.toLowerCase().includes(q)
        const matchSupplier = exp.supplier?.name?.toLowerCase().includes(q)
        const matchInvoice = exp.supplier_invoice_number?.toLowerCase().includes(q)
        if (!matchConcept && !matchSupplier && !matchInvoice) return false
      }
      if (categoryFilter !== "all" && exp.category_id !== categoryFilter) return false
      if (paymentMethodFilter !== "all" && exp.payment_method !== paymentMethodFilter) return false
      return true
    })
  }, [expenses, searchExpense, categoryFilter, paymentMethodFilter])

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (searchAP) {
        const q = searchAP.toLowerCase()
        const matchSupplier = acc.supplier?.name?.toLowerCase().includes(q)
        const matchConcept = acc.expense?.concept?.toLowerCase().includes(q)
        if (!matchSupplier && !matchConcept) return false
      }
      if (statusFilter !== "all" && acc.status !== statusFilter) return false
      return true
    })
  }, [accounts, searchAP, statusFilter])

  // ═══════════════════════════════════════════════════════════
  // Stats (memoizados)
  // ═══════════════════════════════════════════════════════════
  const totalGastos = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses])
  const numGastos = filteredExpenses.length

  const categoryTop = useMemo(() => {
    const totals: Record<string, { name: string; total: number }> = {}
    filteredExpenses.forEach((e) => {
      const name = e.category?.name || "Otros"
      if (!totals[name]) totals[name] = { name, total: 0 }
      totals[name].total += e.amount
    })
    const sorted = Object.values(totals).sort((a, b) => b.total - a.total)
    return sorted[0]?.name || "—"
  }, [filteredExpenses])

  // ═══════════════════════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════════════════════
  const handleEditExpense = (exp: ExpenseExpanded) => {
    setSelectedExpense(exp as unknown as Expense)
    setShowExpenseForm(true)
  }

  const handleNewExpense = () => {
    setSelectedExpense(null)
    setShowExpenseForm(true)
  }

  const handleDeleteExpense = async (exp: ExpenseExpanded) => {
    const { error } = await supabase.from("expenses").delete().eq("id", exp.id)
    if (error) {
      toast.error("Error al eliminar gasto", { description: error.message })
    } else {
      toast.success("Gasto eliminado", { description: exp.concept })
      fetchExpenses()
    }
  }

  const handleAbonar = (acc: AccountPayableExpanded) => {
    setSelectedAccount(acc)
    setShowAPPayment(true)
  }

  const handleExport = async () => {
    if (filteredExpenses.length === 0) {
      toast.error("No hay gastos para exportar")
      return
    }
    toast.promise(exportExpensesToExcel(filteredExpenses as ExpenseForExport[]), {
      loading: "Generando reporte...",
      success: "Reporte descargado",
      error: "Error al generar reporte",
    })
  }

  const fetchAll = () => {
    fetchExpenses()
    fetchAccounts()
  }

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Gastos" description="Control de gastos y cuentas por pagar">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download size={16} className="mr-1.5" />
          Descargar reporte
        </Button>
        <Button size="sm" onClick={handleNewExpense}>
          <Plus size={16} className="mr-1.5" />
          Registrar gasto
        </Button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total gastos"
          value={totalGastos}
          icon="TrendingDown"
          format="currency"
          borderColor="error"
          delay={0}
        />
        <StatCard
          label="# Gastos"
          value={numGastos}
          icon="ShoppingCart"
          format="number"
          borderColor="gold"
          delay={1}
        />
        <StatCard
          label="AP pendientes"
          value={apPendingTotal}
          icon="Banknote"
          format="currency"
          borderColor="warning"
          delay={2}
        />
        <StatCard
          label="# Cuentas AP"
          value={accounts.filter((a) => a.status !== "paid").length}
          icon="DollarSign"
          format="number"
          borderColor="info"
          delay={3}
        />
      </div>

      {/* Categoría top info */}
      {categoryTop !== "—" && numGastos > 0 && (
        <div className="-mt-4 pl-1">
          <p className="text-xs text-muted-foreground">
            Mayor gasto en: <span className="font-semibold text-foreground">{categoryTop}</span>
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("gastos")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "gastos"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Gastos
        </button>
        <button
          onClick={() => setActiveTab("cuentas_por_pagar")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "cuentas_por_pagar"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Cuentas por Pagar
          {accounts.filter((a) => a.status !== "paid").length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-semibold">
              {accounts.filter((a) => a.status !== "paid").length}
            </span>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB: GASTOS                                                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "gastos" && (
        <div className="space-y-4">
          {/* Period selector */}
          <PeriodSelector
            selectedPeriod={period}
            onPeriodChange={setPeriod}
            customFrom={customFrom}
            onCustomFromChange={setCustomFrom}
            customTo={customTo}
            onCustomToChange={setCustomTo}
          />

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar concepto, proveedor..."
                value={searchExpense}
                onChange={(e) => setSearchExpense(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Método pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los métodos</SelectItem>
                {PAYMENT_METHODS.map((pm) => (
                  <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabla de gastos */}
          {loadingExpenses ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <EmptyState
              icon={TrendingDown}
              title="Sin gastos en este periodo"
              description="Registra un gasto para comenzar a llevar el control."
            />
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-cream hover:bg-cream">
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[100px]">Fecha</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Concepto</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[140px]">Categoría</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[120px]">Monto</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[110px]">Método</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[80px] text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((exp) => (
                    <TableRow
                      key={exp.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEditExpense(exp)}
                    >
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatDateShort(exp.expense_date)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">{exp.concept}</p>
                          {exp.supplier?.name && (
                            <p className="text-xs text-muted-foreground">{exp.supplier.name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {exp.category && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: exp.category.color }}
                            />
                            {exp.category.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold text-gold tabular-nums">
                          {formatCOP(exp.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {PAYMENT_METHODS.find((m) => m.value === exp.payment_method)?.label || exp.payment_method}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => handleEditExpense(exp)}
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-error hover:text-error"
                            onClick={() => handleDeleteExpense(exp)}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Resumen */}
          {filteredExpenses.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
              <span>{filteredExpenses.length} gasto{filteredExpenses.length !== 1 ? "s" : ""}</span>
              <span className="font-semibold text-foreground">
                Total: {formatCOP(totalGastos)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB: CUENTAS POR PAGAR                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "cuentas_por_pagar" && (
        <div className="space-y-4">
          {/* Filtros AP */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar proveedor, concepto..."
                value={searchAP}
                onChange={(e) => setSearchAP(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
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

          {/* Tabla AP */}
          {loadingAccounts ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredAccounts.length === 0 ? (
            <EmptyState
              icon={CreditCard}
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
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[110px]">Total</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[110px]">Pagado</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[110px]">Pendiente</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[120px]">Progreso</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[100px]">Vence</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[90px]">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[70px] text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((acc) => {
                    const pct = acc.total_amount > 0
                      ? Math.round((acc.paid_amount / acc.total_amount) * 100)
                      : 0
                    const isPaid = acc.status === "paid"

                    return (
                      <TableRow key={acc.id} className="hover:bg-muted/50">
                        <TableCell className="text-sm font-medium">
                          {acc.supplier?.name || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {acc.expense?.concept || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums">
                          {formatCOP(acc.total_amount)}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums text-success font-medium">
                          {formatCOP(acc.paid_amount)}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums text-error font-medium">
                          {formatCOP(acc.remaining_amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-border rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isPaid ? "bg-success" : "bg-gold"
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                              {pct}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {acc.due_date ? formatDateShort(acc.due_date) : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={acc.status as "pending" | "partial" | "paid" | "overdue"}
                            label={
                              acc.status === "pending" ? "Pendiente" :
                              acc.status === "partial" ? "Parcial" :
                              acc.status === "paid" ? "Pagada" :
                              acc.status === "overdue" ? "Vencida" : acc.status
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {!isPaid && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-gold hover:text-gold"
                              onClick={() => handleAbonar(acc)}
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

          {/* Resumen AP */}
          {filteredAccounts.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
              <span>{filteredAccounts.length} cuenta{filteredAccounts.length !== 1 ? "s" : ""}</span>
              <span className="font-semibold text-error">
                Total pendiente: {formatCOP(
                  filteredAccounts
                    .filter((a) => a.status !== "paid")
                    .reduce((s, a) => s + a.remaining_amount, 0)
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DIALOGS                                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <ExpenseFormDialog
        open={showExpenseForm}
        onOpenChange={setShowExpenseForm}
        expense={selectedExpense}
        onCompleted={fetchAll}
      />

      <APPaymentDialog
        open={showAPPayment}
        onOpenChange={setShowAPPayment}
        account={selectedAccount}
        onPaymentRegistered={fetchAll}
      />
    </div>
  )
}
