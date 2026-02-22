"use client"

import { CalendarDays } from "lucide-react"
import { Input } from "@/components/ui/input"
import { type PeriodKey, PERIODS } from "@/lib/date-periods"

interface PeriodSelectorProps {
  selectedPeriod: PeriodKey
  onPeriodChange: (period: PeriodKey) => void
  customFrom: string
  onCustomFromChange: (value: string) => void
  customTo: string
  onCustomToChange: (value: string) => void
}

export function PeriodSelector({
  selectedPeriod,
  onPeriodChange,
  customFrom,
  onCustomFromChange,
  customTo,
  onCustomToChange,
}: PeriodSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarDays size={16} className="text-muted-foreground" />
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => onPeriodChange(p.key)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedPeriod === p.key
              ? "bg-gold text-white"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          {p.label}
        </button>
      ))}
      {selectedPeriod === "custom" && (
        <div className="flex items-center gap-2 ml-2">
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="h-8 w-[140px] text-xs"
          />
          <span className="text-xs text-muted-foreground">a</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="h-8 w-[140px] text-xs"
          />
        </div>
      )}
    </div>
  )
}
