"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { formatCOP, formatNumber } from "@/lib/format"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Banknote,
  Building2,
  Users,
  ShoppingCart,
  ArrowUp,
  ArrowDown,
  type LucideIcon,
} from "lucide-react"

// Mapa de iconos disponibles para las stat cards
const ICON_MAP: Record<string, LucideIcon> = {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Banknote,
  Building2,
  Users,
  ShoppingCart,
}

interface StatCardProps {
  label: string
  value: number
  icon: string
  format?: "currency" | "number" | "units"
  borderColor?: "gold" | "success" | "error" | "warning" | "info"
  trend?: {
    value: number
    isPositive: boolean
  }
  delay?: number
}

// Colores del borde izquierdo según estado
const BORDER_COLORS = {
  gold: "border-l-gold",
  success: "border-l-success",
  error: "border-l-error",
  warning: "border-l-warning",
  info: "border-l-info",
}

export function StatCard({
  label,
  value,
  icon,
  format = "currency",
  borderColor = "gold",
  trend,
  delay = 0,
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Animación count-up
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 50)
    return () => clearTimeout(timer)
  }, [delay])

  useEffect(() => {
    if (!isVisible || value === 0) return

    const duration = 800
    const steps = 30
    const stepTime = duration / steps
    let current = 0

    const timer = setInterval(() => {
      current++
      const progress = current / steps
      // Easing ease-out
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(value * eased))

      if (current >= steps) {
        setDisplayValue(value)
        clearInterval(timer)
      }
    }, stepTime)

    return () => clearInterval(timer)
  }, [isVisible, value])

  const Icon = ICON_MAP[icon] || DollarSign

  const formattedValue = () => {
    switch (format) {
      case "currency":
        return formatCOP(displayValue)
      case "number":
        return formatNumber(displayValue)
      case "units":
        return `${formatNumber(displayValue)} uds`
      default:
        return formatNumber(displayValue)
    }
  }

  return (
    <Card
      ref={ref}
      className={cn(
        "relative border-l-[3px] p-5 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5",
        BORDER_COLORS[borderColor],
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      )}
      style={{ transitionDelay: `${delay * 50}ms` }}
    >
      {/* Icono en la esquina superior derecha */}
      <Icon
        size={20}
        className="absolute top-4 right-4 text-muted-foreground/50"
      />

      {/* Label */}
      <p className="text-[13px] font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-2">
        {label}
      </p>

      {/* Valor principal */}
      <p className="font-serif text-2xl md:text-3xl font-bold text-gold tabular-nums">
        {formattedValue()}
      </p>

      {/* Tendencia comparativa */}
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend.isPositive ? (
            <ArrowUp size={14} className="text-success" />
          ) : (
            <ArrowDown size={14} className="text-error" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              trend.isPositive ? "text-success" : "text-error"
            )}
          >
            {trend.value > 0 ? "+" : ""}
            {trend.value}% vs mes anterior
          </span>
        </div>
      )}
    </Card>
  )
}
