"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, X } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { PRODUCT_COLORS, PRODUCT_CUTS, SIZES } from "@/lib/constants"
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
  const [sku, setSku] = useState("")
  const [basePrice, setBasePrice] = useState("")
  const [baseCost, setBaseCost] = useState("")
  const [selectedColors, setSelectedColors] = useState<typeof PRODUCT_COLORS>([])
  const [selectedCuts, setSelectedCuts] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string[]>>({})
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Rellenar datos al editar
  useEffect(() => {
    if (product) {
      setName(product.name)
      setDescription(product.description || "")
      setSku(product.sku)
      setBasePrice(String(product.base_price))
      setBaseCost(String(product.base_cost))
      setIsActive(product.is_active)

      // Extraer colores, cortes y tallas de las variantes existentes
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
      // Valores por defecto para crear
      setName("")
      setDescription("")
      setSku("")
      setBasePrice("179000")
      setBaseCost("133981")
      setSelectedColors([])
      setSelectedCuts([])
      setSelectedSizes({})
      setIsActive(true)
    }
  }, [product, open])

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
        // Limpiar tallas del corte eliminado
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

  // Calcular variantes que se generarán
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

    if (!name || !sku || !basePrice || !baseCost) {
      toast.error("Completa todos los campos requeridos")
      return
    }

    if (variantPreview.length === 0) {
      toast.error("Selecciona al menos un color, corte y talla")
      return
    }

    setLoading(true)

    try {
      if (isEditing && product) {
        // Actualizar producto existente
        const { error } = await supabase
          .from("products")
          .update({
            name,
            description: description || null,
            sku,
            base_price: parseFloat(basePrice),
            base_cost: parseFloat(baseCost),
            is_active: isActive,
          })
          .eq("id", product.id)

        if (error) throw error

        // Desactivar variantes que ya no aplican y crear nuevas
        for (const vp of variantPreview) {
          const exists = product.product_variants.find(
            (v) =>
              v.color === vp.color && v.cut === vp.cut && v.size === vp.size
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
        // Crear producto nuevo
        const { data: newProduct, error } = await supabase
          .from("products")
          .insert({
            name,
            description: description || null,
            sku,
            base_price: parseFloat(basePrice),
            base_cost: parseFloat(baseCost),
            is_active: true,
          })
          .select()
          .single()

        if (error) throw error

        // Crear variantes
        const variants = variantPreview.map((vp) => ({
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nombre y SKU */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prod-name">Nombre *</Label>
              <Input
                id="prod-name"
                placeholder="Camiseta Oversized 320gr"
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
                value={baseCost}
                onChange={(e) => setBaseCost(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Colores */}
          <div className="space-y-2">
            <Label>Colores disponibles *</Label>
            <div className="flex gap-3">
              {PRODUCT_COLORS.map((color) => {
                const selected = selectedColors.find(
                  (c) => c.name === color.name
                )
                return (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => toggleColor(color)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm",
                      selected
                        ? "border-gold bg-gold-light text-foreground"
                        : "border-border hover:border-gold/50"
                    )}
                  >
                    <span
                      className="size-4 rounded-full border border-border"
                      style={{ backgroundColor: color.hex }}
                    />
                    {color.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cortes */}
          <div className="space-y-2">
            <Label>Cortes *</Label>
            <div className="flex gap-3">
              {PRODUCT_CUTS.map((cut) => (
                <button
                  key={cut}
                  type="button"
                  onClick={() => toggleCut(cut)}
                  className={cn(
                    "px-4 py-2 rounded-lg border transition-all text-sm",
                    selectedCuts.includes(cut)
                      ? "border-gold bg-gold-light text-foreground"
                      : "border-border hover:border-gold/50"
                  )}
                >
                  {cut}
                </button>
              ))}
            </div>
          </div>

          {/* Tallas por corte */}
          {selectedCuts.map((cut) => (
            <div key={cut} className="space-y-2">
              <Label>Tallas para {cut} *</Label>
              <div className="flex gap-2">
                {SIZES.map((size) => (
                  <button
                    key={`${cut}-${size}`}
                    type="button"
                    onClick={() => toggleSize(cut, size)}
                    className={cn(
                      "size-10 rounded-lg border text-sm font-medium transition-all",
                      (selectedSizes[cut] || []).includes(size)
                        ? "border-gold bg-gold text-white"
                        : "border-border hover:border-gold/50"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Preview de variantes */}
          {variantPreview.length > 0 && (
            <div className="space-y-2">
              <Label>
                Variantes a generar ({variantPreview.length})
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {variantPreview.map((v, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs"
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: v.colorHex }}
                    />
                    {v.color} {v.cut} {v.size}
                  </span>
                ))}
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
