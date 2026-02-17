import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

/**
 * Formatea un número como pesos colombianos: $179.000
 */
export function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formatea un número con separadores de miles: 1.234.567
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("es-CO").format(num)
}

/**
 * Formatea una fecha en español: "16 de febrero de 2026"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: es })
}

/**
 * Formatea una fecha corta: "16 feb 2026"
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "d MMM yyyy", { locale: es })
}

/**
 * Formatea una fecha con hora: "16 feb 2026, 3:45 PM"
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "d MMM yyyy, h:mm a", { locale: es })
}

/**
 * Tiempo relativo: "hace 3 horas", "hace 2 días"
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: es })
}

/**
 * Saludo según la hora del día
 */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Buenos días"
  if (hour < 18) return "Buenas tardes"
  return "Buenas noches"
}

/**
 * Formatea la fecha actual completa en español: "Lunes, 16 de febrero de 2026"
 */
export function formatCurrentDate(): string {
  return format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
}

/**
 * Genera iniciales de un nombre: "Yeison Moreno" → "YM"
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}

/**
 * Formatea porcentaje: 33.33 → "33,33%"
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals).replace(".", ",")}%`
}
