"use client"

import { useState, useEffect, useMemo } from "react"
import { Loader2, Search, Check, ChevronDown, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  PRODUCT_COLORS,
  PRODUCT_CATEGORIES,
  SIZES_BY_CATEGORY,
  CUTS_BY_CATEGORY,
  COLOR_GROUPS,
  SIZES,
  PRODUCT_CUTS,
} from "@/lib/constants"
import type { Product, ProductVariant } from "@/lib/types"

interface ProductWithVariants extends Product {
  product_variants: ProductVariant[]
}

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductWithVariants | null
  onCompleted: () => void
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onCompleted,
}: ProductFormDialogProps) {
  const isEditing = !!product
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [sku, setSku] = useState("")
  const [basePrice, setBasePrice] = useState("")
  const [baseCost, setBaseCost] = useState("")
  const [selectedColors, setSelectedColors] = useState<typeof PRODUCT_COLORS>([])
  const [selectedCuts, setSelectedCuts] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string[]>>({})
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)

  // Estado del selector de colores
  const [colorSearch, setColorSearch] = useState("")
  const [colorPickerOpen, setColorPickerOpen] = useState(false)

  const supabase = createClient()

  // Tallas y cortes según categoría seleccionada
  const availableSizes = SIZES_BY_CATEGORY[category] || SIZES
  const availableCuts = CUTS_BY_CATEGORY[category] || PRODUCT_CUTS

  // Filtrar colores por búsqueda
  const filteredColorGroups = useMemo(() => {
    if (!colorSearch.trim()) return COLOR_GROUPS
    const q = colorSearch.toLowerCase()
    return COLOR_GROUPS.map((group) => ({
      ...group,
      colors: group.colors.filter((name) => name.toLowerCase().includes(q)),
    })).filter((group) => group.colors.length > 0)
  }, [colorSearch])

  // Rellenar datos al editar
  useEffect(() => {
    if (product) {
      setName(product.name)
      setDescription(product.description || "")
      setCategory(product.category || "")
      setSku(product.sku)
      setBasePrice(String(product.base_price))
      setBaseCost(String(product.base_cost))
      setIsActive(product.is_active)

      const colors = [...new Set(product.product_variants.map((v) => v.color))]
      const cuts = [...new Set(product.product_variants.map((v) => v.cut))]

      setSelectedColors(
        colors.map((c) => {
          const variant = product.product_variants.find((v) => v.color === c)
          return { name: c, hex: variant?.color_hex || "#000000" }
        })
      )
      setSelectedCuts(cuts)

      const sizesMap: Record<string, string[]> = {}
      cuts.forEach((cut) => {
        sizesMap[cut] = [
          ...new Set(
            product.product_variants
              .filter((v) => v.cut === cut)
              .map((v) => v.size)
          ),
        ]
      })
      setSelectedSizes(sizesMap)
    } else {
      setName("")
      setDescription("")
      setCategory("")
      setSku("")
      setBasePrice("")
      setBaseCost("")
      setSelectedColors([])
      setSelectedCuts([])
      setSelectedSizes({})
      setIsActive(true)
      setColorSearch("")
      setColorPickerOpen(false)
    }
  }, [product, open])

  // Al cambiar categoría, limpiar cortes y tallas que ya no aplican
  useEffect(() => {
    if (!category) return
    setSelectedCuts((prev) =>
      prev.filter((cut) => (CUTS_BY_CATEGORY[category] || PRODUCT_CUTS).includes(cut))
    )
    setSelectedSizes((prev) => {
      const sizes = SIZES_BY_CATEGORY[category] || SIZES
      const newMap: Record<string, string[]> = {}
      Object.entries(prev).forEach(([cut, cutSizes]) => {
        newMap[cut] = cutSizes.filter((s) => sizes.includes(s))
      })
      return newMap
    })
  }, [category])

  const toggleColor = (color: (typeof PRODUCT_COLORS)[0]) => {
    setSelectedColors((prev) =>
      prev.find((c) => c.name === color.name)
        ? prev.filter((c) => c.name !== color.name)
        : [...prev, color]
    )
  }

  const toggleCut = (cut: string) => {
    setSelectedCuts((prev) => {
      if (prev.includes(cut)) {
        const newCuts = prev.filter((c) => c !== cut)
        const newSizes = { ...selectedSizes }
        delete newSizes[cut]
        setSelectedSizes(newSizes)
        return newCuts
      }
      return [...prev, cut]
    })
  }

  const toggleSize = (cut: string, size: string) => {
    setSelectedSizes((prev) => {
      const current = prev[cut] || []
      return {
        ...prev,
        [cut]: current.includes(size)
          ? current.filter((s) => s !== size)
          : [...current, size],
      }
    })
  }

  const selectAllSizes = (cut: string) => {
    setSelectedSizes((prev) => ({
      ...prev,
      [cut]: [...availableSizes],
    }))
  }

  // Variantes que se generarán
  const variantPreview = selectedColors.flatMap((color) =>
    selectedCuts.flatMap((cut) =>
      (selectedSizes[cut] || []).map((size) => ({
        color: color.name,
        colorHex: color.hex,
        cut,
        size,
      }))
    )
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !sku || !basePrice || !baseCost || !category) {
      toast.error("Completa todos los campos requeridos")
      return
    }

    if (variantPreview.length === 0 && availableCuts.length > 0) {
      toast.error("Selecciona al menos un color, corte y talla")
      return
    }

    // Productos sin cortes (accesorios, etc.) necesitan al menos un color
    if (availableCuts.length === 0 && selectedColors.length === 0) {
      toast.error("Selecciona al menos un color")
      return
    }

    setLoading(true)

    try {
      // Para categorías sin cortes, generar variantes simples (color × talla)
      const finalVariants =
        availableCuts.length === 0
          ? selectedColors.flatMap((color) =>
              (selectedSizes["_default"] || availableSizes).map((size) => ({
                color: color.name,
                colorHex: color.hex,
                cut: category,
                size,
              }))
            )
          : variantPreview

      if (isEditing && product) {
        const { error } = await supabase
          .from("products")
          .update({
            name,
            description: description || null,
            category,
            sku,
            base_price: parseFloat(basePrice),
            base_cost: parseFloat(baseCost),
            is_active: isActive,
          })
          .eq("id", product.id)

        if (error) throw error

        for (const vp of finalVariants) {
          const exists = product.product_variants.find(
            (v) => v.color === vp.color && v.cut === vp.cut && v.size === vp.size
          )

          if (!exists) {
            await supabase.from("product_variants").insert({
              product_id: product.id,
              color: vp.color,
              color_hex: vp.colorHex,
              size: vp.size,
              cut: vp.cut,
              stock: 0,
              min_stock_alert: 5,
              cost_per_unit: parseFloat(baseCost),
              sku_variant: `${sku}-${vp.color.substring(0, 3).toUpperCase()}-${vp.cut.substring(0, 3).toUpperCase()}-${vp.size}`,
              is_active: true,
            })
          }
        }

        toast.success("Producto actualizado")
      } else {
        const { data: newProduct, error } = await supabase
          .from("products")
          .insert({
            name,
            description: description || null,
            category,
            sku,
            base_price: parseFloat(basePrice),
            base_cost: parseFloat(baseCost),
            is_active: true,
          })
          .select()
          .single()

        if (error) throw error

        const variants = finalVariants.map((vp) => ({
          product_id: newProduct.id,
          color: vp.color,
          color_hex: vp.colorHex,
          size: vp.size,
          cut: vp.cut,
          stock: 0,
          min_stock_alert: 5,
          cost_per_unit: parseFloat(baseCost),
          sku_variant: `${sku}-${vp.color.substring(0, 3).toUpperCase()}-${vp.cut.substring(0, 3).toUpperCase()}-${vp.size}`,
          is_active: true,
        }))

        const { error: variantError } = await supabase
          .from("product_variants")
          .insert(variants)

        if (variantError) throw variantError

        toast.success("Producto creado", {
          description: `${name} con ${variants.length} variantes`,
        })
      }

      onOpenChange(false)
      onCompleted()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error al guardar producto", { description: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ============ CATEGORÍA ============ */}
          <div className="space-y-2">
            <Label>Categoría del producto *</Label>
            <div className="grid grid-cols-4 gap-2">
              {PRODUCT_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    "px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-center",
                    category === cat.value
                      ? "border-gold bg-gold/10 text-gold ring-1 ring-gold/30"
                      : "border-border hover:border-gold/40 hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* ============ NOMBRE Y SKU ============ */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prod-name">Nombre del producto *</Label>
              <Input
                id="prod-name"
                placeholder={
                  category === "tenis"
                    ? "Nike Air Max 90"
                    : category === "busos"
                    ? "Buso Oversized 380gr"
                    : "Camiseta Oversized 320gr"
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prod-sku">SKU *</Label>
              <Input
                id="prod-sku"
                placeholder="CAM-OVS-320"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="prod-desc">Descripción</Label>
            <Textarea
              id="prod-desc"
              placeholder="Descripción del producto..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={loading}
            />
          </div>

          {/* Precio y costo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prod-price">Precio de venta (COP) *</Label>
              <Input
                id="prod-price"
                type="number"
                min="0"
                placeholder="179000"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prod-cost">Costo base (COP) *</Label>
              <Input
                id="prod-cost"
                type="number"
                min="0"
                placeholder="133981"
                value={baseCost}
                onChange={(e) => setBaseCost(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* ============ SELECTOR DE COLORES ============ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Colores disponibles *</Label>
              {selectedColors.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectedColors.length} seleccionados
                </span>
              )}
            </div>

            {/* Colores seleccionados */}
            {selectedColors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedColors.map((color) => (
                  <Badge
                    key={color.name}
                    variant="secondary"
                    className="gap-1.5 pl-1.5 pr-1 py-1 cursor-pointer hover:bg-destructive/10 transition-colors"
                    onClick={() => toggleColor(color)}
                  >
                    <span
                      className="size-3.5 rounded-full border border-border/50 shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-xs">{color.name}</span>
                    <X size={12} className="text-muted-foreground hover:text-destructive" />
                  </Badge>
                ))}
              </div>
            )}

            {/* Botón para abrir/cerrar el picker */}
            <button
              type="button"
              onClick={() => setColorPickerOpen(!colorPickerOpen)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all",
                colorPickerOpen
                  ? "border-gold ring-1 ring-gold/20"
                  : "border-border hover:border-gold/40"
              )}
            >
              <span className="text-muted-foreground">
                {selectedColors.length === 0
                  ? "Seleccionar colores..."
                  : `${selectedColors.length} color${selectedColors.length !== 1 ? "es" : ""} seleccionado${selectedColors.length !== 1 ? "s" : ""}`}
              </span>
              <ChevronDown
                size={16}
                className={cn(
                  "text-muted-foreground transition-transform",
                  colorPickerOpen && "rotate-180"
                )}
              />
            </button>

            {/* Panel de colores desplegable */}
            {colorPickerOpen && (
              <div className="border border-border rounded-lg bg-card shadow-sm overflow-hidden">
                {/* Buscador */}
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar color..."
                      value={colorSearch}
                      onChange={(e) => setColorSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Grid de colores agrupados */}
                <div className="max-h-[280px] overflow-y-auto p-2 space-y-3">
                  {filteredColorGroups.map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 px-1">
                        {group.label}
                      </p>
                      <div className="grid grid-cols-4 gap-1">
                        {group.colors.map((colorName) => {
                          const color = PRODUCT_COLORS.find((c) => c.name === colorName)
                          if (!color) return null
                          const isSelected = selectedColors.some((c) => c.name === color.name)
                          const isDark = isColorDark(color.hex)
                          return (
                            <button
                              key={color.name}
                              type="button"
                              onClick={() => toggleColor(color)}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all",
                                isSelected
                                  ? "bg-gold/10 ring-1 ring-gold/40"
                                  : "hover:bg-muted/60"
                              )}
                            >
                              <span className="relative shrink-0">
                                <span
                                  className="block size-5 rounded-full border border-border/60"
                                  style={{ backgroundColor: color.hex }}
                                />
                                {isSelected && (
                                  <Check
                                    size={10}
                                    className={cn(
                                      "absolute inset-0 m-auto",
                                      isDark ? "text-white" : "text-black"
                                    )}
                                    strokeWidth={3}
                                  />
                                )}
                              </span>
                              <span className="truncate">{color.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {filteredColorGroups.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No se encontraron colores
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ============ CORTES (dinámico según categoría) ============ */}
          {availableCuts.length > 0 && (
            <div className="space-y-2">
              <Label>Cortes *</Label>
              <div className="flex flex-wrap gap-2">
                {availableCuts.map((cut) => (
                  <button
                    key={cut}
                    type="button"
                    onClick={() => toggleCut(cut)}
                    className={cn(
                      "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                      selectedCuts.includes(cut)
                        ? "border-gold bg-gold/10 text-gold ring-1 ring-gold/30"
                        : "border-border hover:border-gold/40 text-muted-foreground"
                    )}
                  >
                    {cut}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ============ TALLAS POR CORTE (dinámico según categoría) ============ */}
          {availableCuts.length > 0
            ? selectedCuts.map((cut) => (
                <div key={cut} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Tallas para {cut} *</Label>
                    <button
                      type="button"
                      onClick={() => selectAllSizes(cut)}
                      className="text-[11px] text-gold hover:text-gold-hover transition-colors font-medium"
                    >
                      Seleccionar todas
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((size) => (
                      <button
                        key={`${cut}-${size}`}
                        type="button"
                        onClick={() => toggleSize(cut, size)}
                        className={cn(
                          "min-w-[40px] px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                          (selectedSizes[cut] || []).includes(size)
                            ? "border-gold bg-gold text-white"
                            : "border-border hover:border-gold/40 text-muted-foreground"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            : /* Categorías sin cortes: selector de tallas directo */
              category && availableSizes.length > 0 && availableSizes[0] !== "Unitalla" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Tallas *</Label>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSizes({ _default: [...availableSizes] })
                      }
                      className="text-[11px] text-gold hover:text-gold-hover transition-colors font-medium"
                    >
                      Seleccionar todas
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize("_default", size)}
                        className={cn(
                          "min-w-[40px] px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                          (selectedSizes["_default"] || []).includes(size)
                            ? "border-gold bg-gold text-white"
                            : "border-border hover:border-gold/40 text-muted-foreground"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

          {/* ============ PREVIEW DE VARIANTES ============ */}
          {variantPreview.length > 0 && (
            <div className="space-y-2">
              <Label>
                Variantes a generar ({variantPreview.length})
              </Label>
              <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                {variantPreview.slice(0, 50).map((v, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs"
                  >
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: v.colorHex }}
                    />
                    {v.color} · {v.cut} · {v.size}
                  </span>
                ))}
                {variantPreview.length > 50 && (
                  <span className="text-xs text-muted-foreground py-1">
                    +{variantPreview.length - 50} más...
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Estado activo (solo editar) */}
          {isEditing && (
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="prod-active">Producto activo</Label>
              <Switch
                id="prod-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin mr-1.5" />}
              {isEditing ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Determina si un color hex es oscuro (para elegir color de check) */
function isColorDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Luminance relativa
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}
