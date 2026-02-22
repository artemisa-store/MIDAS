"use client"

import { useMemo, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  DollarSign,
  Receipt,
  Package,
  Layers,
  TrendingDown,
  Landmark,
  ClipboardList,
  Users,
  Wrench,
  Megaphone,
  UserCircle,
  BarChart3,
  Settings,
  Truck,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  X,
} from "lucide-react"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ROLE_LABELS } from "@/lib/constants"

// Mapa de iconos para renderizar dinámicamente
const ICON_MAP = {
  LayoutDashboard,
  DollarSign,
  Receipt,
  Package,
  Layers,
  TrendingDown,
  Landmark,
  ClipboardList,
  Users,
  Wrench,
  Megaphone,
  UserCircle,
  BarChart3,
  Settings,
  Truck,
  BookOpen,
} as const

type IconName = keyof typeof ICON_MAP

interface NavItemConfig {
  label: string
  href: string
  icon: IconName
  section: "principal" | "secundaria" | "admin"
}

const NAV_ITEMS: NavItemConfig[] = [
  // Principal
  { label: "Dashboard", href: "/", icon: "LayoutDashboard", section: "principal" },
  { label: "Ventas", href: "/ventas", icon: "DollarSign", section: "principal" },
  { label: "Facturación", href: "/facturacion", icon: "Receipt", section: "principal" },
  { label: "Inventario", href: "/inventario", icon: "Package", section: "principal" },
  { label: "Materias Primas", href: "/materias-primas", icon: "Layers", section: "principal" },
  { label: "Gastos", href: "/gastos", icon: "TrendingDown", section: "principal" },
  { label: "Caja y Banco", href: "/caja", icon: "Landmark", section: "principal" },
  { label: "Cuentas", href: "/cuentas", icon: "ClipboardList", section: "principal" },
  { label: "Socios", href: "/socios", icon: "Users", section: "principal" },
  // Secundaria
  { label: "Herramientas", href: "/herramientas", icon: "Wrench", section: "secundaria" },
  { label: "Pautas", href: "/pautas", icon: "Megaphone", section: "secundaria" },
  { label: "Clientes", href: "/clientes", icon: "UserCircle", section: "secundaria" },
  { label: "Proveedores", href: "/proveedores", icon: "Truck", section: "secundaria" },
  { label: "Reportes", href: "/reportes", icon: "BarChart3", section: "secundaria" },
  { label: "Wiki", href: "/wiki", icon: "BookOpen", section: "secundaria" },
  // Admin
  { label: "Configuración", href: "/configuracion", icon: "Settings", section: "admin" },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
}

export function Sidebar({ isOpen, onClose, collapsed = false, onCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { user, isAdmin, hasPermission, logout } = useAuth()

  const isActive = useCallback((href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }, [pathname])

  const { principalItems, secundariaItems, adminItems } = useMemo(() => ({
    principalItems: NAV_ITEMS.filter((item) => item.section === "principal"),
    secundariaItems: NAV_ITEMS.filter((item) => item.section === "secundaria"),
    adminItems: NAV_ITEMS.filter((item) => item.section === "admin"),
  }), [])

  const renderNavItem = useCallback((item: NavItemConfig) => {
    const Icon = ICON_MAP[item.icon]
    const active = isActive(item.href)

    // Verificar permisos (admin ve todo, otros según permisos)
    if (item.section === "admin" && !isAdmin) return null

    const linkContent = (
      <Link
        href={item.href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-150",
          active
            ? "bg-sidebar-active text-gold border-l-[3px] border-gold pl-[13px]"
            : "text-[#9CA3AF] hover:bg-sidebar-hover hover:text-white",
          collapsed && "justify-center px-0"
        )}
      >
        <Icon className={cn("shrink-0", active ? "text-gold" : "")} size={20} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    )

    // Tooltip cuando está colapsado
    if (collapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.label}
          </TooltipContent>
        </Tooltip>
      )
    }

    return <div key={item.href}>{linkContent}</div>
  }, [isActive, isAdmin, onClose, collapsed])

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "px-6 py-5 border-b border-[#1A1A1A]",
        collapsed && "px-2 flex justify-center"
      )}>
        <Link href="/" className="block" onClick={onClose}>
          <h1 className={cn(
            "font-[family-name:var(--font-display)] text-gold font-bold tracking-[0.08em]",
            collapsed ? "text-lg" : "text-2xl"
          )}>
            MIDAS<span className="text-gold/60">·</span>
          </h1>
          {!collapsed && (
            <p className="text-[11px] text-[#6B6B6B] tracking-wide mt-0.5">
              Casa Artemisa
            </p>
          )}
        </Link>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {/* Sección principal */}
        {principalItems.map(renderNavItem)}

        {/* Separador */}
        <div className="my-4 border-t border-[#1A1A1A]" />

        {/* Sección secundaria */}
        {!collapsed && (
          <p className="px-4 text-[11px] uppercase tracking-[0.1em] text-[#4A4A4A] mb-2 mt-2">
            Herramientas
          </p>
        )}
        {secundariaItems.map(renderNavItem)}

        {/* Admin */}
        {isAdmin && (
          <>
            <div className="my-4 border-t border-[#1A1A1A]" />
            {adminItems.map(renderNavItem)}
          </>
        )}
      </nav>

      {/* Botón colapsar (solo desktop) */}
      <div className="hidden lg:block px-3 py-2 border-t border-[#1A1A1A]">
        <button
          onClick={() => onCollapse && onCollapse(!collapsed)}
          className="flex items-center justify-center w-full py-2 text-[#6B6B6B] hover:text-white transition-colors rounded-lg hover:bg-sidebar-hover"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Perfil del usuario */}
      {user && (
        <div className={cn(
          "px-3 py-3 border-t border-[#1A1A1A]",
          collapsed && "px-2"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-sidebar-hover transition-colors",
                collapsed && "justify-center px-0"
              )}>
                {/* Avatar */}
                <div className={cn(
                  "shrink-0 rounded-full flex items-center justify-center text-sm font-semibold",
                  "size-9",
                  isAdmin ? "bg-gold text-white" : "bg-[#374151] text-white"
                )}>
                  {getInitials(user.full_name)}
                </div>
                {!collapsed && (
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.full_name.split(" ")[0]}
                    </p>
                    <p className="text-[11px] text-[#6B6B6B]">
                      {ROLE_LABELS[user.role]}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-48">
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
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Sidebar desktop */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-sidebar-bg border-r border-[#1A1A1A] z-40 transition-all duration-300",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar mobile (drawer) */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-0 h-screen w-[280px] bg-sidebar-bg z-50 transition-transform duration-250",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Botón cerrar en mobile */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6B6B6B] hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>
    </>
  )
}
