// ===== Utilidades compartidas para selección de períodos =====

export type PeriodKey = "today" | "week" | "month" | "last_month" | "custom"

export interface PeriodOption {
  key: PeriodKey
  label: string
}

export const PERIODS: PeriodOption[] = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mes" },
  { key: "last_month", label: "Mes anterior" },
  { key: "custom", label: "Personalizado" },
]

/** Formatea Date local a YYYY-MM-DD (sin conversión UTC) */
export function toLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Calcula rango de fechas para un período predefinido */
export function getDateRange(period: PeriodKey): { from: string; to: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (period) {
    case "today": {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return { from: toLocalDate(today), to: toLocalDate(tomorrow) }
    }
    case "week": {
      const dayOfWeek = today.getDay()
      const monday = new Date(today)
      monday.setDate(monday.getDate() - ((dayOfWeek + 6) % 7))
      const nextMonday = new Date(monday)
      nextMonday.setDate(nextMonday.getDate() + 7)
      return { from: toLocalDate(monday), to: toLocalDate(nextMonday) }
    }
    case "month": {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const firstDayNext = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      return { from: toLocalDate(firstDay), to: toLocalDate(firstDayNext) }
    }
    case "last_month": {
      const firstDayLast = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const firstDayCurrent = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: toLocalDate(firstDayLast), to: toLocalDate(firstDayCurrent) }
    }
    default:
      return { from: "", to: "" }
  }
}
