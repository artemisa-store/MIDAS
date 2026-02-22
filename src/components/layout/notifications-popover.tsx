"use client"

import Link from "next/link"
import {
  Bell,
  AlertTriangle,
  Clock,
  ShoppingCart,
  CheckCheck,
  BellOff,
} from "lucide-react"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { useNotifications, type Notification } from "@/hooks/use-notifications"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

const NOTIFICATION_ICONS: Record<Notification["type"], typeof AlertTriangle> = {
  low_stock: AlertTriangle,
  overdue_account: Clock,
  pending_order: ShoppingCart,
}

const NOTIFICATION_COLORS: Record<Notification["type"], string> = {
  low_stock: "text-warning",
  overdue_account: "text-error",
  pending_order: "text-info",
}

const NOTIFICATION_BG: Record<Notification["type"], string> = {
  low_stock: "bg-warning/10",
  overdue_account: "bg-error/10",
  pending_order: "bg-info/10",
}

export function NotificationsPopover() {
  const { notifications, unreadCount, loading, markAllAsRead } =
    useNotifications()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell size={20} className="text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 size-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-in zoom-in-50">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              <CheckCheck size={14} className="mr-1" />
              Marcar leídas
            </Button>
          )}
        </div>

        {/* Lista */}
        <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Cargando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
              <BellOff size={28} strokeWidth={1.5} />
              <p className="text-sm font-medium">Sin notificaciones</p>
              <p className="text-xs">Todo está al día</p>
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = NOTIFICATION_ICONS[n.type]
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                >
                  <div
                    className={cn(
                      "p-1.5 rounded-lg shrink-0 mt-0.5",
                      NOTIFICATION_BG[n.type]
                    )}
                  >
                    <Icon
                      size={14}
                      className={NOTIFICATION_COLORS[n.type]}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug font-medium">
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatRelativeTime(n.timestamp)}
                    </p>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
