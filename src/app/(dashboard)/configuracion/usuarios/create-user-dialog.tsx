"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ROLE_LABELS, DEFAULT_PERMISSIONS } from "@/lib/constants"
import type { UserRole } from "@/lib/types"

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function CreateUserDialog({ open, onOpenChange, onCreated }: CreateUserDialogProps) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("socio")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName || !email || !password) {
      toast.error("Todos los campos son requeridos")
      return
    }

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres")
      return
    }

    setLoading(true)

    try {
      // Crear usuario en Supabase Auth via admin API
      // Nota: En producción, esto debería hacerse via una Edge Function
      // que use la service_role key. Por ahora usamos el flujo estándar.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      })

      if (authError) {
        toast.error("Error al crear usuario", { description: authError.message })
        return
      }

      if (authData.user) {
        // Insertar en la tabla public.users
        const { error: profileError } = await supabase.from("users").upsert({
          id: authData.user.id,
          email,
          full_name: fullName,
          role,
          module_permissions: DEFAULT_PERMISSIONS[role],
          is_active: true,
        })

        if (profileError) {
          toast.error("Error al guardar perfil", { description: profileError.message })
          return
        }
      }

      toast.success("Usuario creado correctamente", {
        description: `${fullName} (${ROLE_LABELS[role]})`,
      })

      // Limpiar formulario
      setFullName("")
      setEmail("")
      setPassword("")
      setRole("socio")
      onOpenChange(false)
      onCreated()
    } catch {
      toast.error("Error inesperado al crear usuario")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre completo</Label>
            <Input
              id="name"
              placeholder="Nombre del usuario"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-email">Correo electrónico</Label>
            <Input
              id="create-email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-password">Contraseña inicial</Label>
            <Input
              id="create-password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin mr-1.5" />}
              Crear usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
