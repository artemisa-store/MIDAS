"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
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
import type { Supplier } from "@/lib/types"

interface SupplierFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier | null
  onCompleted: (supplier?: Supplier) => void
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
  onCompleted,
}: SupplierFormDialogProps) {
  const isEditing = !!supplier
  const [name, setName] = useState("")
  const [contactName, setContactName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [suppliesDescription, setSuppliesDescription] = useState("")
  const [notes, setNotes] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  // Rellenar al editar
  useEffect(() => {
    if (supplier) {
      setName(supplier.name)
      setContactName(supplier.contact_name || "")
      setPhone(supplier.phone || "")
      setEmail(supplier.email || "")
      setSuppliesDescription(supplier.supplies_description || "")
      setNotes(supplier.notes || "")
      setIsActive(supplier.is_active)
    } else {
      setName("")
      setContactName("")
      setPhone("")
      setEmail("")
      setSuppliesDescription("")
      setNotes("")
      setIsActive(true)
    }
  }, [supplier, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("El nombre del proveedor es requerido")
      return
    }

    // Validar email si se proporcionó
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("El email no tiene un formato válido")
      return
    }

    setLoading(true)

    try {
      const payload = {
        name: name.trim(),
        contact_name: contactName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        supplies_description: suppliesDescription.trim() || null,
        notes: notes.trim() || null,
        is_active: isActive,
      }

      if (isEditing && supplier) {
        const { error } = await supabase
          .from("suppliers")
          .update(payload)
          .eq("id", supplier.id)

        if (error) throw error

        toast.success("Proveedor actualizado")
        onOpenChange(false)
        onCompleted()
      } else {
        const { data: newSupplier, error } = await supabase
          .from("suppliers")
          .insert(payload)
          .select()
          .single()

        if (error) throw error

        toast.success("Proveedor creado", {
          description: name.trim(),
        })
        onOpenChange(false)
        onCompleted(newSupplier as unknown as Supplier)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error al guardar proveedor", { description: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar proveedor" : "Nuevo proveedor"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre empresa */}
          <div className="space-y-1.5">
            <Label htmlFor="sup-name">Nombre del proveedor *</Label>
            <Input
              id="sup-name"
              placeholder="Ej: Empaques del Valle S.A.S."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Contacto + Teléfono */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sup-contact">Persona de contacto</Label>
              <Input
                id="sup-contact"
                placeholder="Ej: María López"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-phone">Teléfono / WhatsApp</Label>
              <Input
                id="sup-phone"
                placeholder="Ej: 300 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="sup-email">Correo electrónico</Label>
            <Input
              id="sup-email"
              type="email"
              placeholder="proveedor@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Qué suministra */}
          <div className="space-y-1.5">
            <Label htmlFor="sup-supplies">¿Qué suministra?</Label>
            <Textarea
              id="sup-supplies"
              placeholder="Ej: Cajas kraft, bolsas de empaque, papel de seda..."
              value={suppliesDescription}
              onChange={(e) => setSuppliesDescription(e.target.value)}
              rows={2}
              disabled={loading}
            />
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="sup-notes">Notas internas</Label>
            <Textarea
              id="sup-notes"
              placeholder="Condiciones de pago, tiempos de entrega, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={loading}
            />
          </div>

          {/* Estado activo (solo editar) */}
          {isEditing && (
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="sup-active">Proveedor activo</Label>
              <Switch
                id="sup-active"
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
              {isEditing ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
