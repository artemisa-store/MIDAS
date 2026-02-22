"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

const READ_KEY = "midas:read-notifications"
const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutos

export interface Notification {
  id: string
  type: "low_stock" | "overdue_account" | "pending_order"
  message: string
  href: string
  timestamp: string
  key: string
}

function getReadKeys(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"))
  } catch {
    return new Set()
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [readKeys, setReadKeys] = useState<Set<string>>(getReadKeys)

  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0]
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

    const [lowStock, overdue, pendingOrders] = await Promise.all([
      // 1. Stock bajo
      supabase
        .from("product_variants")
        .select("id, color, size, stock, min_stock_alert, product:products(name)")
        .eq("is_active", true)
        .lte("stock", 10)
        .order("stock", { ascending: true })
        .limit(20),

      // 2. Cuentas vencidas
      supabase
        .from("accounts_receivable")
        .select("id, remaining_amount, due_date, client:clients(full_name), sale:sales(invoice_number)")
        .lt("due_date", today)
        .neq("status", "paid")
        .order("due_date", { ascending: true })
        .limit(5),

      // 3. Pedidos pendientes > 3 días
      supabase
        .from("sales")
        .select("id, invoice_number, total, created_at, client:clients(full_name)")
        .eq("status", "pending")
        .lt("created_at", threeDaysAgo)
        .order("created_at", { ascending: true })
        .limit(5),
    ])

    const items: Notification[] = []

    // Procesar stock bajo (filtro client-side: stock < min_stock_alert)
    if (lowStock.data) {
      const filtered = (lowStock.data as unknown as Array<{
        id: string
        color: string
        size: string
        stock: number
        min_stock_alert: number
        product: { name: string } | null
      }>)
        .filter((v) => v.stock < v.min_stock_alert)
        .slice(0, 5)

      for (const v of filtered) {
        const variant = [v.color, v.size].filter(Boolean).join(" · ")
        items.push({
          id: `ls-${v.id}`,
          type: "low_stock",
          message: `Stock bajo: ${v.product?.name || "Producto"} (${variant}) — ${v.stock} und.`,
          href: "/inventario",
          timestamp: new Date().toISOString(),
          key: `low_stock:${v.id}`,
        })
      }
    }

    // Procesar cuentas vencidas
    if (overdue.data) {
      for (const a of overdue.data as unknown as Array<{
        id: string
        remaining_amount: number
        due_date: string
        client: { full_name: string } | null
        sale: { invoice_number: string } | null
      }>) {
        items.push({
          id: `oa-${a.id}`,
          type: "overdue_account",
          message: `Cuenta vencida: ${a.client?.full_name || "Cliente"} — $${Math.round(a.remaining_amount).toLocaleString("es-CO")}`,
          href: "/cuentas",
          timestamp: a.due_date,
          key: `overdue:${a.id}`,
        })
      }
    }

    // Procesar pedidos pendientes
    if (pendingOrders.data) {
      for (const s of pendingOrders.data as unknown as Array<{
        id: string
        invoice_number: string
        total: number
        created_at: string
        client: { full_name: string } | null
      }>) {
        items.push({
          id: `po-${s.id}`,
          type: "pending_order",
          message: `Pedido pendiente: ${s.invoice_number} de ${s.client?.full_name || "Cliente"}`,
          href: "/ventas",
          timestamp: s.created_at,
          key: `pending:${s.id}`,
        })
      }
    }

    setNotifications(items)
    setLoading(false)
  }, [supabase])

  // Fetch on mount + intervalo
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const unreadCount = notifications.filter((n) => !readKeys.has(n.key)).length

  const markAllAsRead = () => {
    const keys = new Set(notifications.map((n) => n.key))
    setReadKeys(keys)
    try {
      localStorage.setItem(READ_KEY, JSON.stringify([...keys]))
    } catch { /* ignore */ }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAllAsRead,
    refresh: fetchNotifications,
  }
}
