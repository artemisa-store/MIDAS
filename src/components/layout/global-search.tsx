"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
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
  UserPlus,
  Plus,
  Clock,
  X,
  type LucideIcon,
} from "lucide-react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import { useGlobalSearch } from "@/hooks/use-global-search"
import { formatCOP } from "@/lib/format"

// Mapa de iconos string → componente (mismo patrón que sidebar)
const ICON_MAP: Record<string, LucideIcon> = {
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
}

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter()
  const {
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
  } = useGlobalSearch()

  // Reset query cuando se cierra
  useEffect(() => {
    if (!open) setQuery("")
  }, [open, setQuery])

  const handleSelect = (href: string, searchTerm?: string) => {
    if (searchTerm) addRecentSearch(searchTerm)
    onOpenChange(false)
    router.push(href)
  }

  const hasQuery = query.trim().length > 0
  const hasResults =
    navResults.length > 0 ||
    clientResults.length > 0 ||
    productResults.length > 0 ||
    saleResults.length > 0

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Buscar"
      description="Busca páginas, clientes, productos y ventas"
      showCloseButton={false}
    >
      <CommandInput
        placeholder="Buscar páginas, clientes, productos, ventas..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {hasQuery && !hasResults && !isSearching && (
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
        )}

        {hasQuery && isSearching && !hasResults && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Buscando...
          </div>
        )}

        {/* ===== Estado vacío: acciones rápidas + recientes ===== */}
        {!hasQuery && (
          <>
            <CommandGroup heading="Acciones rápidas">
              <CommandItem onSelect={() => handleSelect("/facturacion")}>
                <Plus size={16} className="text-gold" />
                <span>Nueva factura</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/clientes")}>
                <UserPlus size={16} className="text-info" />
                <span>Nuevo cliente</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/inventario")}>
                <Package size={16} className="text-success" />
                <span>Ver inventario</span>
              </CommandItem>
            </CommandGroup>

            {recentSearches.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Búsquedas recientes">
                  {recentSearches.map((term) => (
                    <CommandItem
                      key={term}
                      onSelect={() => setQuery(term)}
                    >
                      <Clock size={16} className="text-muted-foreground" />
                      <span>{term}</span>
                    </CommandItem>
                  ))}
                  <CommandItem
                    onSelect={clearRecentSearches}
                    className="text-muted-foreground"
                  >
                    <X size={16} />
                    <span>Limpiar recientes</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </>
        )}

        {/* ===== Resultados de búsqueda ===== */}
        {hasQuery && (
          <>
            {/* Navegación */}
            {navResults.length > 0 && (
              <CommandGroup heading="Navegación">
                {navResults.map((item) => {
                  const Icon = ICON_MAP[item.icon]
                  return (
                    <CommandItem
                      key={item.href}
                      onSelect={() => handleSelect(item.href, query)}
                    >
                      {Icon && <Icon size={16} className="text-gold" />}
                      <span>{item.label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}

            {/* Clientes */}
            {clientResults.length > 0 && (
              <CommandGroup heading="Clientes">
                {clientResults.map((client) => (
                  <CommandItem
                    key={client.id}
                    onSelect={() => handleSelect("/clientes", query)}
                  >
                    <UserCircle size={16} className="text-info" />
                    <div className="flex flex-col">
                      <span>{client.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[client.phone_whatsapp, client.city]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Productos */}
            {productResults.length > 0 && (
              <CommandGroup heading="Productos">
                {productResults.map((product) => (
                  <CommandItem
                    key={product.id}
                    onSelect={() => handleSelect("/inventario", query)}
                  >
                    <Package size={16} className="text-success" />
                    <div className="flex flex-col">
                      <span>{product.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {product.sku} · {product.category}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Ventas */}
            {saleResults.length > 0 && (
              <CommandGroup heading="Ventas">
                {saleResults.map((sale) => (
                  <CommandItem
                    key={sale.id}
                    onSelect={() => handleSelect("/ventas", query)}
                  >
                    <Receipt size={16} className="text-warning" />
                    <div className="flex flex-col">
                      <span>{sale.invoice_number}</span>
                      <span className="text-xs text-muted-foreground">
                        {sale.client?.full_name || "—"} · {formatCOP(sale.total)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
