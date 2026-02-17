"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User as AppUser, ModulePermissions, UserRole, ModuleName } from "@/lib/types"

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  hasPermission: (module: ModuleName) => boolean
  isAdmin: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  hasPermission: () => false,
  isAdmin: false,
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Obtener sesión actual
    const getUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (authUser) {
          // Buscar datos del usuario en la tabla public.users
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", authUser.id)
            .single()

          if (profile) {
            setUser(profile as AppUser)
          }
        }
      } catch (error) {
        console.error("Error al obtener usuario:", error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single()

          if (profile) {
            setUser(profile as AppUser)
          }
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const hasPermission = (module: ModuleName): boolean => {
    if (!user) return false
    if (user.role === "admin") return true
    return user.module_permissions?.[module] ?? false
  }

  const isAdmin = user?.role === "admin"

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = "/login"
  }

  return (
    <AuthContext.Provider value={{ user, loading, hasPermission, isAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider")
  }
  return context
}
