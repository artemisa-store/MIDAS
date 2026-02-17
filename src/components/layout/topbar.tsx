"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Search, Bell, User, LogOut, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/providers/auth-provider"
import { getInitials } from "@/lib/format"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ROLE_LABELS } from "@/lib/constants"

// Mapa de rutas a nombres legibles para el breadcrumb
const ROUTE_NAMES: Record<string, string> = {
  "/": "Dashboard",
  "/ventas": "Ventas",
  "/facturacion": "Facturación",
  "/inventario": "Inventario",
  "/inventario/productos": "Productos",
  "/inventario/movimientos": "Movimientos",
  "/gastos": "Gastos",
  "/caja": "Caja y Banco",
  "/cuentas": "Cuentas",
  "/socios": "Socios",
  "/herramientas": "Herramientas",
  "/pautas": "Pautas",
  "/clientes": "Clientes",
  "/reportes": "Reportes",
  "/configuracion": "Configuración",
  "/configuracion/usuarios": "Usuarios",
  "/perfil": "Mi Perfil",
}

interface TopbarProps {
  onMenuClick: () => void
  sidebarCollapsed?: boolean
}

export function Topbar({ onMenuClick, sidebarCollapsed = false }: TopbarProps) {
  const [searchFocused, setSearchFocused] = useState(false)
  const pathname = usePathname()
  const { user, isAdmin, logout } = useAuth()

  // Generar breadcrumb desde la ruta actual
  const breadcrumbs = () => {
    if (pathname === "/") return [{ label: "Dashboard", href: "/" }]

    const segments = pathname.split("/").filter(Boolean)
    const crumbs = [{ label: "Dashboard", href: "/" }]

    let currentPath = ""
    for (const segment of segments) {
      currentPath += `/${segment}`
      const label = ROUTE_NAMES[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1)
      crumbs.push({ label, href: currentPath })
    }

    return crumbs
  }

  return (
    <header
      className={cn(
        "fixed top-0 right-0 h-16 bg-white border-b border-border z-30 flex items-center justify-between px-4 md:px-6 transition-all duration-300",
        sidebarCollapsed ? "lg:left-[72px]" : "lg:left-[260px]",
        "left-0"
      )}
    >
      {/* Izquierda: hamburger (mobile) + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Menu size={20} className="text-foreground" />
        </button>

        <nav className="hidden sm:flex items-center gap-1 text-sm">
          {breadcrumbs().map((crumb, index) => {
            const isLast = index === breadcrumbs().length - 1
            return (
              <div key={crumb.href} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight size={14} className="text-muted-foreground" />
                )}
                {isLast ? (
                  <span className="font-semibold text-foreground">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground hover:text-gold transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* Derecha: búsqueda + notificaciones + avatar */}
      <div className="flex items-center gap-2">
        {/* Búsqueda */}
        <div
          className={cn(
            "relative transition-all duration-200",
            searchFocused ? "w-64" : "w-40",
            "hidden md:block"
          )}
        >
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Buscar..."
            className="pl-9 h-9 bg-cream border-border text-sm"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>

        {/* Botón búsqueda mobile */}
        <button className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors">
          <Search size={20} className="text-muted-foreground" />
        </button>

        {/* Notificaciones */}
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell size={20} className="text-muted-foreground" />
          {/* Badge de notificaciones pendientes */}
          {/* <span className="absolute top-1 right-1 size-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span> */}
        </button>

        {/* Avatar del usuario */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 pl-2">
                <div
                  className={cn(
                    "size-9 rounded-full flex items-center justify-center text-sm font-semibold transition-transform hover:scale-105",
                    isAdmin ? "bg-gold text-white" : "bg-muted text-foreground"
                  )}
                >
                  {getInitials(user.full_name)}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {ROLE_LABELS[user.role]}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/perfil" className="flex items-center gap-2">
                  <User size={16} />
                  Mi perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-error focus:text-error"
                onClick={logout}
              >
                <LogOut size={16} />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
