"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Shield, User as UserIcon, Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { getInitials, formatRelativeTime } from "@/lib/format"
import { ROLE_LABELS } from "@/lib/constants"
import type { User } from "@/lib/types"
import { CreateUserDialog } from "./create-user-dialog"
import { UserDrawer } from "./user-drawer"

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const { isAdmin } = useAuth()
  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: true })

    if (!error && data) {
      setUsers(data as User[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (!isAdmin) {
    return (
      <EmptyState
        icon={Shield}
        title="Acceso restringido"
        description="Solo el administrador puede gestionar usuarios."
      />
    )
  }

  return (
    <div>
      <PageHeader title="Usuarios" description="Gestión de cuentas y permisos del sistema">
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus size={18} className="mr-1.5" />
          Crear usuario
        </Button>
      </PageHeader>

      {/* Búsqueda */}
      <div className="relative max-w-sm mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg skeleton-shimmer" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={UserIcon}
          title="Sin usuarios"
          description="Crea el primer usuario del sistema."
        />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-cream hover:bg-cream">
                <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                  Usuario
                </TableHead>
                <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                  Email
                </TableHead>
                <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                  Rol
                </TableHead>
                <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground">
                  Estado
                </TableHead>
                <TableHead className="text-xs uppercase tracking-[0.05em] font-semibold text-muted-foreground hidden md:table-cell">
                  Último acceso
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow
                  key={u.id}
                  className="cursor-pointer hover:bg-cream-dark/50 transition-colors"
                  onClick={() => setSelectedUser(u)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "size-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
                          u.role === "admin"
                            ? "bg-gold text-white"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {getInitials(u.full_name)}
                      </div>
                      <span className="font-medium text-sm">{u.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        u.role === "admin" && "bg-gold/10 text-gold",
                        u.role === "socio" && "bg-info/10 text-info",
                        u.role === "contador" && "bg-warning/10 text-warning",
                        u.role === "vendedor" && "bg-success/10 text-success"
                      )}
                    >
                      {ROLE_LABELS[u.role]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={u.is_active ? "active" : "inactive"} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                    {u.last_login_at
                      ? formatRelativeTime(u.last_login_at)
                      : "Nunca"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal crear usuario */}
      <CreateUserDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={fetchUsers}
      />

      {/* Drawer detalle usuario */}
      <UserDrawer
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onUpdated={fetchUsers}
      />
    </div>
  )
}
