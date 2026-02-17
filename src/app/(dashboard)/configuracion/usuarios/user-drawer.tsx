"use client"

import { useState, useEffect } from "react"
import { Loader2, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/shared/status-badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { getInitials, formatDate, formatRelativeTime } from "@/lib/format"
import { ROLE_LABELS, MODULE_LABELS } from "@/lib/constants"
import type { User, ModuleName, ModulePermissions } from "@/lib/types"

interface UserDrawerProps {
  user: User | null
  onClose: () => void
  onUpdated: () => void
}

export function UserDrawer({ user, onClose, onUpdated }: UserDrawerProps) {
  const [permissions, setPermissions] = useState<ModulePermissions>({} as ModulePermissions)
  const [saving, setSaving] = useState(false)
  const [showDeactivate, setShowDeactivate] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      setPermissions(user.module_permissions || ({} as ModulePermissions))
    }
  }, [user])

  const handlePermissionChange = (module: ModuleName, enabled: boolean) => {
    setPermissions((prev) => ({ ...prev, [module]: enabled }))
  }

  const savePermissions = async () => {
    if (!user) return
    setSaving(true)

    const { error } = await supabase
      .from("users")
      .update({ module_permissions: permissions })
      .eq("id", user.id)

    if (error) {
      toast.error("Error al guardar permisos", { description: error.message })
    } else {
      toast.success("Permisos actualizados")
      onUpdated()
    }
    setSaving(false)
  }

  const toggleActive = async () => {
    if (!user) return

    const { error } = await supabase
      .from("users")
      .update({ is_active: !user.is_active })
      .eq("id", user.id)

    if (error) {
      toast.error("Error al cambiar estado", { description: error.message })
    } else {
      toast.success(user.is_active ? "Usuario desactivado" : "Usuario reactivado")
      onUpdated()
      setShowDeactivate(false)
      onClose()
    }
  }

  // Módulos editables (excluye dashboard que siempre está activo)
  const editableModules = Object.entries(MODULE_LABELS).filter(
    ([key]) => key !== "dashboard"
  ) as [ModuleName, string][]

  return (
    <>
      {/* Overlay */}
      {user && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 h-screen w-full max-w-md bg-white border-l border-border z-50 shadow-modal transition-transform duration-250",
          user ? "translate-x-0" : "translate-x-full"
        )}
      >
        {user && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">Detalle de usuario</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Info del usuario */}
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "size-14 rounded-full flex items-center justify-center text-lg font-bold",
                    user.role === "admin"
                      ? "bg-gold text-white"
                      : "bg-muted text-foreground"
                  )}
                >
                  {getInitials(user.full_name)}
                </div>
                <div>
                  <h3 className="text-base font-semibold">{user.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                        user.role === "admin" && "bg-gold/10 text-gold",
                        user.role === "socio" && "bg-info/10 text-info",
                        user.role === "contador" && "bg-warning/10 text-warning",
                        user.role === "vendedor" && "bg-success/10 text-success"
                      )}
                    >
                      {ROLE_LABELS[user.role]}
                    </span>
                    <StatusBadge status={user.is_active ? "active" : "inactive"} />
                  </div>
                </div>
              </div>

              {/* Detalles */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Creado</span>
                  <span>{formatDate(user.created_at)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Último acceso</span>
                  <span>
                    {user.last_login_at
                      ? formatRelativeTime(user.last_login_at)
                      : "Nunca"}
                  </span>
                </div>
              </div>

              {/* Permisos de módulos */}
              {user.role !== "admin" && (
                <div>
                  <h4 className="text-sm font-semibold mb-3">
                    Permisos de módulos
                  </h4>
                  <div className="space-y-3">
                    {editableModules.map(([module, label]) => (
                      <div
                        key={module}
                        className="flex items-center justify-between py-1.5"
                      >
                        <Label
                          htmlFor={`perm-${module}`}
                          className="text-sm cursor-pointer"
                        >
                          {label}
                        </Label>
                        <Switch
                          id={`perm-${module}`}
                          checked={permissions[module] ?? false}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(module, checked)
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full mt-4"
                    onClick={savePermissions}
                    disabled={saving}
                  >
                    {saving && (
                      <Loader2 size={16} className="animate-spin mr-1.5" />
                    )}
                    Guardar permisos
                  </Button>
                </div>
              )}
            </div>

            {/* Footer — acciones */}
            <div className="px-6 py-4 border-t border-border">
              <Button
                variant={user.is_active ? "destructive" : "default"}
                className="w-full"
                onClick={() => setShowDeactivate(true)}
              >
                {user.is_active ? "Desactivar usuario" : "Reactivar usuario"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmación de desactivar/activar */}
      <ConfirmDialog
        open={showDeactivate}
        onOpenChange={setShowDeactivate}
        title={
          user?.is_active ? "Desactivar usuario" : "Reactivar usuario"
        }
        description={
          user?.is_active
            ? `¿Estás seguro de desactivar a ${user?.full_name}? No podrá acceder al sistema hasta que lo reactives.`
            : `¿Reactivar a ${user?.full_name}? Podrá volver a acceder al sistema.`
        }
        confirmLabel={user?.is_active ? "Desactivar" : "Reactivar"}
        variant={user?.is_active ? "destructive" : "default"}
        onConfirm={toggleActive}
      />
    </>
  )
}
