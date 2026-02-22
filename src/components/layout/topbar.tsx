"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Search, User, LogOut, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/providers/auth-provider"
import { getInitials } from "@/lib/format"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ROLE_LABELS } from "@/lib/constants"
import { GlobalSearch } from "./global-search"
import { NotificationsPopover } from "./notifications-popover"

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
  "/wiki": "Wiki",
}

interface TopbarProps {
  onMenuClick: () => void
  sidebarCollapsed?: boolean
}

export function Topbar({ onMenuClick, sidebarCollapsed = false }: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()
  const { user, isAdmin, logout } = useAuth()

  // Shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

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
    <>
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
          {/* Búsqueda — trigger desktop */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 w-48 h-9 px-3 bg-cream border border-border rounded-lg text-sm text-muted-foreground hover:bg-cream-dark/50 transition-colors"
          >
            <Search size={16} />
            <span className="flex-1 text-left">Buscar...</span>
            <kbd className="hidden lg:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-background px-1.5 text-[10px] font-mono text-muted-foreground">
              Ctrl K
            </kbd>
          </button>

          {/* Búsqueda — trigger mobile */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={20} className="text-muted-foreground" />
          </button>

          {/* Notificaciones */}
          <NotificationsPopover />

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

      {/* Command palette global */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
