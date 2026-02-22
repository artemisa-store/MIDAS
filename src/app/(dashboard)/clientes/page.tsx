"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Plus,
  Search,
  UserCircle,
  Pencil,
  Loader2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { SALE_CHANNELS } from "@/lib/constants"
import { ClientFormDialog } from "./client-form-dialog"
import type { Client } from "@/lib/types"

const CHANNEL_LABELS: Record<string, string> = {}
for (const ch of SALE_CHANNELS) {
  CHANNEL_LABELS[ch.value] = ch.label
}

export default function ClientesPage() {
  const supabase = createClient()

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("clients")
      .select("*")
      .order("full_name")

    if (data) setClients(data as Client[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Stats
  const activeClients = clients.filter((c) => c.is_active)
  const inactiveClients = clients.filter((c) => !c.is_active)
  const withCredit = clients.filter((c) => c.is_active && c.credit_enabled)

  // Nuevos este mes
  const newThisMonth = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return clients.filter((c) => c.created_at >= monthStart).length
  }, [clients])

  // Filtrado
  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const q = search.toLowerCase()
      const matchesSearch =
        c.full_name.toLowerCase().includes(q) ||
        c.phone_whatsapp.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.cedula_nit || "").toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && c.is_active) ||
        (statusFilter === "inactive" && !c.is_active)

      return matchesSearch && matchesStatus
    })
  }, [clients, search, statusFilter])

  const openCreate = () => {
    setSelectedClient(null)
    setShowForm(true)
  }

  const openEdit = (c: Client) => {
    setSelectedClient(c)
    setShowForm(true)
  }

  return (
    <div>
      <PageHeader title="Clientes" description="Base de datos de clientes (CRM)">
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-1.5" />
          Nuevo cliente
        </Button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Clientes activos"
          value={activeClients.length}
          icon="Users"
          format="number"
          borderColor="gold"
          delay={0}
        />
        <StatCard
          label="Con credito"
          value={withCredit.length}
          icon="DollarSign"
          format="number"
          borderColor="info"
          delay={1}
        />
        <StatCard
          label="Nuevos este mes"
          value={newThisMonth}
          icon="TrendingUp"
          format="number"
          borderColor="success"
          delay={2}
        />
        <StatCard
          label="Inactivos"
          value={inactiveClients.length}
          icon="Users"
          format="number"
          borderColor="warning"
          delay={3}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, telefono, email o cedula..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title="Sin clientes"
          description={
            clients.length === 0
              ? "Registra tu primer cliente."
              : "No se encontraron clientes con los filtros aplicados."
          }
        >
          {clients.length === 0 && (
            <Button className="mt-2" onClick={openCreate}>
              <Plus size={16} className="mr-1.5" />
              Nuevo cliente
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-cream hover:bg-cream">
                  <TableHead className="text-xs font-semibold text-muted-foreground">Nombre</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground hidden sm:table-cell">Telefono</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Ciudad</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground hidden lg:table-cell">Canal origen</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell text-center">Credito</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className="hover:bg-cream-dark/50 transition-colors cursor-pointer"
                    onClick={() => openEdit(c)}
                  >
                    <TableCell>
                      <p className="text-sm font-medium">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground sm:hidden">
                        {c.phone_whatsapp}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm hidden sm:table-cell">
                      {c.phone_whatsapp}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                      {c.city || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                      {c.source_channel ? (CHANNEL_LABELS[c.source_channel] || c.source_channel) : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center">
                      {c.credit_enabled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info border border-info/20">
                          Si
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.is_active ? "active" : "inactive"} />
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                        <Pencil size={14} className="mr-1" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border bg-cream text-xs text-muted-foreground">
            {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}
            {statusFilter !== "all" && ` (${statusFilter === "active" ? "activos" : "inactivos"})`}
          </div>
        </div>
      )}

      {/* Dialog */}
      <ClientFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        client={selectedClient}
        onCompleted={fetchClients}
      />
    </div>
  )
}
