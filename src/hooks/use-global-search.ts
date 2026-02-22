"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { NAV_ITEMS } from "@/lib/constants"

const RECENT_SEARCHES_KEY = "midas:recent-searches"
const MAX_RECENT = 5

interface ClientResult {
  id: string
  full_name: string
  phone_whatsapp: string | null
  city: string | null
}

interface ProductResult {
  id: string
  name: string
  sku: string
  category: string
}

interface SaleResult {
  id: string
  invoice_number: string
  total: number
  status: string
  client: { full_name: string } | null
}

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]")
  } catch {
    return []
  }
}

export function useGlobalSearch() {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [clientResults, setClientResults] = useState<ClientResult[]>([])
  const [productResults, setProductResults] = useState<ProductResult[]>([])
  const [saleResults, setSaleResults] = useState<SaleResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches)

  const { hasPermission } = useAuth()
  const supabase = createClient()
  const requestIdRef = useRef(0)

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  // Navegación filtrada client-side
  const navResults = debouncedQuery.length >= 1
    ? NAV_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(debouncedQuery.toLowerCase()) &&
          hasPermission(item.module)
      )
    : []

  // Búsqueda en BD
  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setClientResults([])
        setProductResults([])
        setSaleResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      const currentId = ++requestIdRef.current

      const [clients, products, sales] = await Promise.all([
        supabase
          .from("clients")
          .select("id, full_name, phone_whatsapp, city")
          .ilike("full_name", `%${q}%`)
          .eq("is_active", true)
          .limit(5),
        supabase
          .from("products")
          .select("id, name, sku, category")
          .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
          .eq("is_active", true)
          .limit(5),
        supabase
          .from("sales")
          .select("id, invoice_number, total, status, client:clients(full_name)")
          .ilike("invoice_number", `%${q}%`)
          .order("created_at", { ascending: false })
          .limit(5),
      ])

      // Descartar si hay una request más reciente
      if (currentId !== requestIdRef.current) return

      setClientResults((clients.data as ClientResult[]) || [])
      setProductResults((products.data as ProductResult[]) || [])
      setSaleResults((sales.data as unknown as SaleResult[]) || [])
      setIsSearching(false)
    },
    [supabase]
  )

  useEffect(() => {
    search(debouncedQuery)
  }, [debouncedQuery, search])

  const addRecentSearch = (term: string) => {
    const trimmed = term.trim()
    if (!trimmed) return
    const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, MAX_RECENT)
    setRecentSearches(updated)
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch { /* ignore */ }
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY)
    } catch { /* ignore */ }
  }

  return {
    query,
    setQuery,
    navResults,
    clientResults,
    productResults,
    saleResults,
    isSearching,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
  }
}
