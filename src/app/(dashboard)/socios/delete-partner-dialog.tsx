"use client"

import { useState, useEffect } from "react"
import { Loader2, AlertTriangle, Info } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Partner } from "@/lib/types"

interface DeletePartnerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partner: Partner | null
  onCompleted: () => void
}

export function DeletePartnerDialog({
  open,
  onOpenChange,
  partner,
  onCompleted,
}: DeletePartnerDialogProps) {
  const supabase = createClient()
  const [deleting, setDeleting] = useState(false)
  const [withdrawalCount, setWithdrawalCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open && partner) {
      setLoading(true)
      supabase
        .from("partner_withdrawals")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", partner.id)
        .then(({ count }) => {
          setWithdrawalCount(count || 0)
          setLoading(false)
        })
    }
  }, [open, partner, supabase])

  if (!partner) return null

  const canDelete = withdrawalCount === 0

  const handleDelete = async () => {
    if (!canDelete) return

    setDeleting(true)

    try {
      const { error } = await supabase
        .from("partners")
        .delete()
        .eq("id", partner.id)

      if (error) throw error

      toast.success("Socio eliminado", {
        description: partner.name,
      })

      onOpenChange(false)
      onCompleted()
    } catch {
      toast.error("Error al eliminar el socio")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] text-xl">
            Eliminar socio
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-gold" />
          </div>
        ) : canDelete ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-error-bg border border-error/20 rounded-lg p-4">
              <AlertTriangle size={20} className="text-error shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-error mb-1">Esta accion no se puede deshacer</p>
                <p className="text-muted-foreground">
                  Se eliminara permanentemente a <strong>{partner.name}</strong> ({partner.distribution_percentage}%).
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-info-bg border border-info/20 rounded-lg p-4">
              <Info size={20} className="text-info shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-info mb-1">No se puede eliminar</p>
                <p className="text-muted-foreground">
                  <strong>{partner.name}</strong> tiene {withdrawalCount} retiro{withdrawalCount !== 1 ? "s" : ""} registrado{withdrawalCount !== 1 ? "s" : ""}.
                  Desactiva el socio en vez de eliminarlo para conservar el historial.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {canDelete ? "Cancelar" : "Cerrar"}
          </Button>
          {canDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 size={16} className="mr-1.5 animate-spin" />}
              Eliminar socio
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
