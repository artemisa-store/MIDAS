"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Landmark,
  Banknote,
  Building2,
  Smartphone,
  Wallet,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Pencil,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
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
import { formatCOP, formatDateShort, formatDateTime } from "@/lib/format"
import { type PeriodKey, PERIODS, toLocalDate, getDateRange } from "@/lib/date-periods"
import type { CashBankAccount, CashMovementType, AccountType, MovementExpanded } from "@/lib/types"
import { PeriodSelector } from "@/components/shared/period-selector"
import { MovementFormDialog } from "./movement-form-dialog"
import { AccountFormDialog } from "./account-form-dialog"

// ═══════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════
type TabKey = "movimientos" | "cuentas"

const MOVEMENT_CONFIG: Record<CashMovementType, {
  label: string
  color: string
  sign: string
  icon: typeof ArrowDownLeft
}> = {
  in: { label: "Ingreso", color: "bg-success/10 text-success", sign: "+", icon: ArrowDownLeft },
  out: { label: "Egreso", color: "bg-error/10 text-error", sign: "−", icon: ArrowUpRight },
  transfer: { label: "Transferencia", color: "bg-info/10 text-info", sign: "↔", icon: ArrowRightLeft },
}

const ACCOUNT_TYPE_CONFIG: Record<AccountType, {
  label: string
  icon: typeof Banknote
  borderColor: string
}> = {
  cash: { label: "Efectivo", icon: Banknote, borderColor: "border-l-success" },
  bank: { label: "Banco", icon: Building2, borderColor: "border-l-info" },
  digital: { label: "Digital", icon: Smartphone, borderColor: "border-l-warning" },
}

// ═══════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════
export default function CajaPage() {
  const supabase = createClient()

  // === Tab ===
  const [activeTab, setActiveTab] = useState<TabKey>("movimientos")

  // === Periodo ===
  const [period, setPeriod] = useState<PeriodKey>("month")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")

  // === Data ===
  const [accounts, setAccounts] = useState<CashBankAccount[]>([])
  const [movements, setMovements] = useState<MovementExpanded[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingMovements, setLoadingMovements] = useState(true)

  // === Filtros movimientos ===
  const [searchMovement, setSearchMovement] = useState("")
  const [accountFilter, setAccountFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  // === Dialogs ===
  const [showMovementForm, setShowMovementForm] = useState(false)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<CashBankAccount | null>(null)

  // ═══════════════════════════════════════════════════════════
  // Fetch accounts
  // ═══════════════════════════════════════════════════════════
  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true)

    const { data, error } = await supabase
      .from("cash_bank_accounts")
      .select("*")
      .order("created_at")

    if (error) {
      console.error("Error cargando cuentas:", error)
      toast.error("Error al cargar cuentas")
    }

    if (data) setAccounts(data as CashBankAccount[])
    setLoadingAccounts(false)
  }, [supabase])

  // ═══════════════════════════════════════════════════════════
  // Fetch movements
  // ═══════════════════════════════════════════════════════════
  const fetchMovements = useCallback(async () => {
    setLoadingMovements(true)

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
      .from("cash_bank_movements")
      .select(`
        *,
        account:cash_bank_accounts(name, type)
      `)
      .order("created_at", { ascending: false })

    if (dateFrom) query = query.gte("created_at", dateFrom)
    if (dateTo) query = query.lt("created_at", dateTo)

    const { data, error } = await query

    if (error) {
      console.error("Error cargando movimientos:", error)
    }

    if (data) setMovements(data as unknown as MovementExpanded[])
    setLoadingMovements(false)
  }, [supabase, period, customFrom, customTo])

  // ═══════════════════════════════════════════════════════════
  // Effects
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  // ═══════════════════════════════════════════════════════════
  // Filtered data
  // ═══════════════════════════════════════════════════════════
  const filteredMovements = useMemo(() => {
    return movements.filter((mov) => {
      if (searchMovement) {
        const q = searchMovement.toLowerCase()
        const matchConcept = mov.concept.toLowerCase().includes(q)
        const matchAccount = mov.account?.name?.toLowerCase().includes(q)
        if (!matchConcept && !matchAccount) return false
      }
      if (accountFilter !== "all" && mov.account_id !== accountFilter) return false
      if (typeFilter !== "all" && mov.movement_type !== typeFilter) return false
      return true
    })
  }, [movements, searchMovement, accountFilter, typeFilter])

  // ═══════════════════════════════════════════════════════════
  // Stats (memoizados)
  // ═══════════════════════════════════════════════════════════
  const activeAccounts = useMemo(() => accounts.filter((a) => a.is_active), [accounts])
  const totalBalance = useMemo(() => activeAccounts.reduce((s, a) => s + a.balance, 0), [activeAccounts])

  const { totalIngresos, totalEgresos } = useMemo(() => ({
    totalIngresos: filteredMovements
      .filter((m) => m.movement_type === "in")
      .reduce((s, m) => s + m.amount, 0),
    totalEgresos: filteredMovements
      .filter((m) => m.movement_type === "out")
      .reduce((s, m) => s + m.amount, 0),
  }), [filteredMovements])

  // ═══════════════════════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════════════════════
  const handleNewMovement = () => {
    setShowMovementForm(true)
  }

  const handleNewAccount = () => {
    setSelectedAccount(null)
    setShowAccountForm(true)
  }

  const handleEditAccount = (acc: CashBankAccount) => {
    setSelectedAccount(acc)
    setShowAccountForm(true)
  }

  const fetchAll = () => {
    fetchAccounts()
    fetchMovements()
  }

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Caja y Banco" description="Movimientos de efectivo y cuentas bancarias">
        <Button variant="outline" size="sm" onClick={handleNewAccount}>
          <Plus size={16} className="mr-1.5" />
          Nueva cuenta
        </Button>
        <Button size="sm" onClick={handleNewMovement}>
          <Plus size={16} className="mr-1.5" />
          Nuevo movimiento
        </Button>
      </PageHeader>

      {/* Account Cards */}
      {loadingAccounts ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total consolidado */}
          <Card className="relative border-l-[3px] border-l-gold p-4 bg-gradient-to-br from-gold/5 to-transparent">
            <Wallet size={18} className="absolute top-3 right-3 text-gold/50" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-1">
              Total consolidado
            </p>
            <p className="font-[family-name:var(--font-display)] text-xl md:text-2xl font-bold text-gold tabular-nums">
              {formatCOP(totalBalance)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {activeAccounts.length} cuenta{activeAccounts.length !== 1 ? "s" : ""} activa{activeAccounts.length !== 1 ? "s" : ""}
            </p>
          </Card>

          {/* Cada cuenta */}
          {activeAccounts.map((acc) => {
            const config = ACCOUNT_TYPE_CONFIG[acc.type]
            const Icon = config.icon
            return (
              <Card
                key={acc.id}
                className={`relative border-l-[3px] ${config.borderColor} p-4 cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200`}
                onClick={() => handleEditAccount(acc)}
              >
                <Icon size={18} className="absolute top-3 right-3 text-muted-foreground/40" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-1 truncate pr-6">
                  {acc.name}
                </p>
                <p className="font-[family-name:var(--font-display)] text-lg md:text-xl font-bold text-gold tabular-nums">
                  {formatCOP(acc.balance)}
                </p>
                <span className={`inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  acc.type === "cash" ? "bg-success/10 text-success" :
                  acc.type === "bank" ? "bg-info/10 text-info" :
                  "bg-warning/10 text-warning"
                }`}>
                  {config.label}
                </span>
              </Card>
            )
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("movimientos")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "movimientos"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Movimientos
        </button>
        <button
          onClick={() => setActiveTab("cuentas")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "cuentas"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Cuentas
          <span className="ml-2 px-1.5 py-0.5 rounded-full bg-muted-foreground/10 text-muted-foreground text-xs font-semibold">
            {accounts.length}
          </span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB: MOVIMIENTOS                                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "movimientos" && (
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

          {/* Resumen rápido ingresos / egresos */}
          {filteredMovements.length > 0 && (
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <ArrowDownLeft size={14} className="text-success" />
                <span className="text-muted-foreground">Ingresos:</span>
                <span className="font-semibold text-success tabular-nums">{formatCOP(totalIngresos)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ArrowUpRight size={14} className="text-error" />
                <span className="text-muted-foreground">Egresos:</span>
                <span className="font-semibold text-error tabular-nums">{formatCOP(totalEgresos)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Neto:</span>
                <span className={`font-semibold tabular-nums ${
                  totalIngresos - totalEgresos >= 0 ? "text-success" : "text-error"
                }`}>
                  {totalIngresos - totalEgresos >= 0 ? "+" : ""}{formatCOP(totalIngresos - totalEgresos)}
                </span>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar concepto, cuenta..."
                value={searchMovement}
                onChange={(e) => setSearchMovement(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Cuenta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las cuentas</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="in">Ingresos</SelectItem>
                <SelectItem value="out">Egresos</SelectItem>
                <SelectItem value="transfer">Transferencias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla de movimientos */}
          {loadingMovements ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredMovements.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title="Sin movimientos en este periodo"
              description="Registra un movimiento para comenzar a llevar el control de caja."
            />
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-cream hover:bg-cream">
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[150px]">Fecha</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">Concepto</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[140px]">Cuenta</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[120px]">Tipo</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[130px]">Monto</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[130px]">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((mov) => {
                    const config = MOVEMENT_CONFIG[mov.movement_type]
                    const MovIcon = config.icon
                    return (
                      <TableRow key={mov.id} className="hover:bg-muted/50">
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {formatDateTime(mov.created_at)}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-foreground">{mov.concept}</p>
                          {mov.transfer_to_account_id && (
                            <p className="text-xs text-muted-foreground">
                              Transferencia entre cuentas
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">
                            {mov.account?.name || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${config.color}`}>
                            <MovIcon size={12} />
                            {config.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`text-sm font-semibold tabular-nums ${
                            mov.movement_type === "in" ? "text-success" :
                            mov.movement_type === "out" ? "text-error" :
                            "text-info"
                          }`}>
                            {config.sign} {formatCOP(mov.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm text-muted-foreground tabular-nums">
                            {formatCOP(mov.new_balance)}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Resumen */}
          {filteredMovements.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
              <span>{filteredMovements.length} movimiento{filteredMovements.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB: CUENTAS                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === "cuentas" && (
        <div className="space-y-4">
          {loadingAccounts ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title="Sin cuentas registradas"
              description="Crea una cuenta de efectivo, bancaria o digital para empezar."
            />
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-cream hover:bg-cream">
                    <TableHead className="text-xs font-semibold text-muted-foreground">Nombre</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[120px]">Tipo</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground text-right w-[150px]">Balance</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[100px]">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-[80px] text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((acc) => {
                    const config = ACCOUNT_TYPE_CONFIG[acc.type]
                    const Icon = config.icon
                    return (
                      <TableRow key={acc.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className={`size-8 rounded-lg flex items-center justify-center ${
                              acc.type === "cash" ? "bg-success/10 text-success" :
                              acc.type === "bank" ? "bg-info/10 text-info" :
                              "bg-warning/10 text-warning"
                            }`}>
                              <Icon size={16} />
                            </div>
                            <span className="text-sm font-medium text-foreground">{acc.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                            acc.type === "cash" ? "bg-success/10 text-success" :
                            acc.type === "bank" ? "bg-info/10 text-info" :
                            "bg-warning/10 text-warning"
                          }`}>
                            {config.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-semibold text-gold tabular-nums">
                            {formatCOP(acc.balance)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={acc.is_active ? "active" : "inactive"}
                            label={acc.is_active ? "Activa" : "Inactiva"}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => handleEditAccount(acc)}
                            title="Editar cuenta"
                          >
                            <Pencil size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Resumen cuentas */}
          {accounts.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
              <span>{accounts.length} cuenta{accounts.length !== 1 ? "s" : ""}</span>
              <span className="font-semibold text-gold">
                Total: {formatCOP(totalBalance)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DIALOGS                                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <MovementFormDialog
        open={showMovementForm}
        onOpenChange={setShowMovementForm}
        accounts={accounts}
        onCompleted={fetchAll}
      />

      <AccountFormDialog
        open={showAccountForm}
        onOpenChange={setShowAccountForm}
        account={selectedAccount}
        onCompleted={fetchAll}
      />
    </div>
  )
}
