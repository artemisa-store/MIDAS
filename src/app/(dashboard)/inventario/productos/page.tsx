"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Package, Pencil, Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatCOP, formatNumber } from "@/lib/format"
import type { Product, ProductVariant } from "@/lib/types"
import { ProductFormDialog } from "./product-form-dialog"

interface ProductWithVariants extends Product {
  product_variants: ProductVariant[]
}

export default function ProductosPage() {
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductWithVariants | null>(null)
  const supabase = createClient()

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*, product_variants(*)")
      .order("created_at", { ascending: false })

    if (!error && data) {
      setProducts(data as unknown as ProductWithVariants[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 skeleton-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Catálogo de productos" description="Gestión de productos y variantes">
        <Button
          onClick={() => {
            setEditingProduct(null)
            setShowForm(true)
          }}
        >
          <Plus size={18} className="mr-1.5" />
          Nuevo producto
        </Button>
      </PageHeader>

      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid de productos */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Sin productos"
          description="Crea el primer producto del catálogo."
        >
          <Button
            className="mt-2"
            onClick={() => {
              setEditingProduct(null)
              setShowForm(true)
            }}
          >
            Crear producto
          </Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const totalStock = product.product_variants?.reduce(
              (sum, v) => sum + v.stock,
              0
            ) || 0
            const variantCount = product.product_variants?.length || 0
            const colors = [
              ...new Set(product.product_variants?.map((v) => v.color) || []),
            ]
            const colorHexes = [
              ...new Set(product.product_variants?.map((v) => v.color_hex) || []),
            ]

            return (
              <Card
                key={product.id}
                className="p-5 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer"
                onClick={() => {
                  setEditingProduct(product)
                  setShowForm(true)
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">{product.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      SKU: {product.sku}
                    </p>
                  </div>
                  <StatusBadge
                    status={product.is_active ? "active" : "inactive"}
                  />
                </div>

                {/* Colores disponibles */}
                <div className="flex items-center gap-1.5 mb-3">
                  {colorHexes.map((hex, i) => (
                    <span
                      key={hex}
                      className="size-5 rounded-full border border-border"
                      style={{ backgroundColor: hex }}
                      title={colors[i]}
                    />
                  ))}
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase">
                      Precio
                    </p>
                    <p className="text-sm font-semibold text-gold tabular-nums">
                      {formatCOP(product.base_price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase">
                      Variantes
                    </p>
                    <p className="text-sm font-semibold tabular-nums">
                      {variantCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase">
                      Stock
                    </p>
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        totalStock === 0 && "text-error",
                        totalStock > 0 && totalStock <= 10 && "text-warning"
                      )}
                    >
                      {formatNumber(totalStock)}
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Diálogo de crear/editar producto */}
      <ProductFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        product={editingProduct}
        onCompleted={fetchProducts}
      />
    </div>
  )
}
