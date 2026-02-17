import type { ModuleName, ModulePermissions } from "./types"

// ===== Navegación del sidebar =====
export const NAV_ITEMS = [
  // Sección principal
  { label: "Dashboard", href: "/", icon: "LayoutDashboard", module: "dashboard" as ModuleName, section: "principal" as const },
  { label: "Ventas", href: "/ventas", icon: "DollarSign", module: "ventas" as ModuleName, section: "principal" as const },
  { label: "Facturación", href: "/facturacion", icon: "Receipt", module: "facturacion" as ModuleName, section: "principal" as const },
  { label: "Inventario", href: "/inventario", icon: "Package", module: "inventario" as ModuleName, section: "principal" as const },
  { label: "Gastos", href: "/gastos", icon: "TrendingDown", module: "gastos" as ModuleName, section: "principal" as const },
  { label: "Caja y Banco", href: "/caja", icon: "Landmark", module: "caja" as ModuleName, section: "principal" as const },
  { label: "Cuentas", href: "/cuentas", icon: "ClipboardList", module: "cuentas" as ModuleName, section: "principal" as const },
  { label: "Socios", href: "/socios", icon: "Users", module: "socios" as ModuleName, section: "principal" as const },

  // Sección secundaria
  { label: "Herramientas", href: "/herramientas", icon: "Wrench", module: "herramientas" as ModuleName, section: "secundaria" as const },
  { label: "Pautas", href: "/pautas", icon: "Megaphone", module: "pautas" as ModuleName, section: "secundaria" as const },
  { label: "Clientes", href: "/clientes", icon: "UserCircle", module: "clientes" as ModuleName, section: "secundaria" as const },
  { label: "Reportes", href: "/reportes", icon: "BarChart3", module: "reportes" as ModuleName, section: "secundaria" as const },

  // Admin
  { label: "Configuración", href: "/configuracion", icon: "Settings", module: "configuracion" as ModuleName, section: "admin" as const },
]

// ===== Permisos por defecto según rol =====
export const DEFAULT_PERMISSIONS: Record<string, ModulePermissions> = {
  admin: {
    dashboard: true,
    ventas: true,
    facturacion: true,
    inventario: true,
    gastos: true,
    caja: true,
    cuentas: true,
    socios: true,
    herramientas: true,
    pautas: true,
    clientes: true,
    reportes: true,
    configuracion: true,
  },
  socio: {
    dashboard: true,
    ventas: true,
    facturacion: true,
    inventario: true,
    gastos: true,
    caja: true,
    cuentas: true,
    socios: true,
    herramientas: true,
    pautas: true,
    clientes: true,
    reportes: true,
    configuracion: false,
  },
  contador: {
    dashboard: true,
    ventas: true,
    facturacion: true,
    inventario: false,
    gastos: true,
    caja: true,
    cuentas: true,
    socios: false,
    herramientas: false,
    pautas: false,
    clientes: false,
    reportes: true,
    configuracion: false,
  },
  vendedor: {
    dashboard: true,
    ventas: true,
    facturacion: false,
    inventario: true,
    gastos: false,
    caja: false,
    cuentas: false,
    socios: false,
    herramientas: false,
    pautas: false,
    clientes: true,
    reportes: false,
    configuracion: false,
  },
}

// ===== Etiquetas de roles =====
export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  socio: "Socio",
  contador: "Contador",
  vendedor: "Vendedor",
}

// ===== Colores de roles =====
export const ROLE_COLORS: Record<string, string> = {
  admin: "bg-gold text-white",
  socio: "bg-info/10 text-info",
  contador: "bg-warning/10 text-warning",
  vendedor: "bg-success/10 text-success",
}

// ===== Estados de venta =====
export const SALE_STATUS_CONFIG = {
  paid: { label: "Pagada", color: "bg-success-bg text-success border-success/20" },
  pending: { label: "Pendiente", color: "bg-warning-bg text-warning border-warning/20" },
  shipped: { label: "Enviada", color: "bg-info-bg text-info border-info/20" },
  delivered: { label: "Entregada", color: "bg-success-bg text-success border-success/20" },
  returned: { label: "Devuelta", color: "bg-error-bg text-error border-error/20" },
}

// ===== Canales de venta =====
export const SALE_CHANNELS = [
  { value: "whatsapp", label: "WhatsApp", icon: "MessageCircle" },
  { value: "instagram", label: "Instagram DM", icon: "Instagram" },
  { value: "presencial", label: "Presencial", icon: "Store" },
  { value: "web", label: "Web", icon: "Globe" },
  { value: "referido", label: "Referido", icon: "UserPlus" },
  { value: "otro", label: "Otro", icon: "MoreHorizontal" },
]

// ===== Métodos de pago =====
export const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo", icon: "Banknote" },
  { value: "bancolombia", label: "Bancolombia", icon: "Building2" },
  { value: "nequi", label: "Nequi", icon: "Smartphone" },
  { value: "daviplata", label: "Daviplata", icon: "Smartphone" },
  { value: "otro", label: "Otro", icon: "CreditCard" },
]

// ===== Tallas =====
export const SIZES = ["S", "M", "L", "XL"]

// ===== Colores de producto =====
export const PRODUCT_COLORS = [
  { name: "Arena", hex: "#C2B280" },
  { name: "Gris Rata", hex: "#8E8E8E" },
  { name: "Blanco", hex: "#F5F5F5" },
]

// ===== Cortes =====
export const PRODUCT_CUTS = ["Oversized", "Boxy Fit"]

// ===== Etiquetas de módulos (para permisos) =====
export const MODULE_LABELS: Record<ModuleName, string> = {
  dashboard: "Dashboard",
  ventas: "Ventas",
  facturacion: "Facturación",
  inventario: "Inventario",
  gastos: "Gastos",
  caja: "Caja y Banco",
  cuentas: "Cuentas por cobrar/pagar",
  socios: "Socios",
  herramientas: "Herramientas",
  pautas: "Pautas publicitarias",
  clientes: "Clientes",
  reportes: "Reportes",
  configuracion: "Configuración",
}

// ===== Categorías de gastos por defecto =====
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Producción", icon: "Factory", color: "#8B5CF6" },
  { name: "Packaging", icon: "PackageOpen", color: "#F59E0B" },
  { name: "Herramientas y suscripciones", icon: "Wrench", color: "#3B82F6" },
  { name: "Pautas publicitarias", icon: "Megaphone", color: "#EF4444" },
  { name: "Envíos y logística", icon: "Truck", color: "#10B981" },
  { name: "Operación", icon: "Building", color: "#6B7280" },
  { name: "Otros", icon: "MoreHorizontal", color: "#9CA3AF" },
]
