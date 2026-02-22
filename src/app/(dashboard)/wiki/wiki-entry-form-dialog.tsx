"use client"

import { useState, useEffect } from "react"
import {
  Loader2,
  FileText,
  KeyRound,
  Lightbulb,
  ListTodo,
  Link2,
  Palette,
  Pin,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  WIKI_CATEGORIES,
  WIKI_TASK_STATUS_OPTIONS,
  WIKI_TASK_PRIORITY_OPTIONS,
} from "@/lib/constants"
import type { WikiEntry, WikiCategory } from "@/lib/types"

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  notas: FileText,
  credenciales: KeyRound,
  ideas: Lightbulb,
  tareas: ListTodo,
  enlaces: Link2,
  identidad: Palette,
}

interface WikiEntryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: WikiEntry | null
  onCompleted: () => void
  defaultCategory?: WikiCategory
}

export function WikiEntryFormDialog({
  open,
  onOpenChange,
  entry,
  onCompleted,
  defaultCategory,
}: WikiEntryFormDialogProps) {
  const supabase = createClient()
  const { user } = useAuth()
  const isEditing = !!entry

  // Campos comunes
  const [category, setCategory] = useState<string>("notas")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isPinned, setIsPinned] = useState(false)

  // Campos de credenciales
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [pin, setPin] = useState("")
  const [url, setUrl] = useState("")

  // Campos de tareas
  const [taskStatus, setTaskStatus] = useState("pendiente")
  const [taskPriority, setTaskPriority] = useState("media")

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      if (entry) {
        setCategory(entry.category)
        setTitle(entry.title)
        setContent(entry.content || "")
        setIsPinned(entry.is_pinned)
        setUsername(entry.metadata?.username || "")
        setPassword(entry.metadata?.password || "")
        setPin(entry.metadata?.pin || "")
        setUrl(entry.metadata?.url || "")
        setTaskStatus(entry.metadata?.status || "pendiente")
        setTaskPriority(entry.metadata?.priority || "media")
      } else {
        setCategory(defaultCategory || "notas")
        setTitle("")
        setContent("")
        setIsPinned(false)
        setUsername("")
        setPassword("")
        setPin("")
        setUrl("")
        setTaskStatus("pendiente")
        setTaskPriority("media")
      }
    }
  }, [open, entry, defaultCategory])

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("El titulo es obligatorio")
      return
    }

    if (category === "enlaces" && !url.trim()) {
      toast.error("La URL es obligatoria para enlaces")
      return
    }

    if (!isEditing && !user?.id) {
      toast.error("No se pudo identificar tu usuario. Recarga la página.")
      return
    }

    setLoading(true)

    try {
      const metadata: Record<string, unknown> = {}

      if (category === "credenciales") {
        if (username.trim()) metadata.username = username.trim()
        if (password.trim()) metadata.password = password.trim()
        if (pin.trim()) metadata.pin = pin.trim()
        if (url.trim()) metadata.url = url.trim()
      } else if (category === "tareas") {
        metadata.status = taskStatus
        metadata.priority = taskPriority
      } else if (category === "enlaces") {
        if (url.trim()) metadata.url = url.trim()
      }

      if (isEditing) {
        const { error } = await supabase
          .from("wiki_entries")
          .update({
            category,
            title: title.trim(),
            content: content.trim() || null,
            metadata,
            is_pinned: isPinned,
          })
          .eq("id", entry.id)
        if (error) {
          console.error("Error wiki update:", error)
          toast.error("Error al guardar", { description: error.message })
          setLoading(false)
          return
        }
        toast.success("Entrada actualizada")
      } else {
        const { error } = await supabase.from("wiki_entries").insert({
          category,
          title: title.trim(),
          content: content.trim() || null,
          metadata,
          is_pinned: isPinned,
          created_by: user!.id,
        })
        if (error) {
          console.error("Error wiki insert:", error)
          toast.error("Error al crear entrada", { description: error.message })
          setLoading(false)
          return
        }
        toast.success("Entrada creada", { description: title.trim() })
      }

      onOpenChange(false)
      onCompleted()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("Error wiki catch:", message)
      toast.error("Error inesperado", { description: message })
    } finally {
      setLoading(false)
    }
  }

  const currentCatConfig = WIKI_CATEGORIES.find((c) => c.value === category)
  const CategoryIcon = CATEGORY_ICONS[category] || FileText

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto p-0">
        {/* Header with gradient */}
        <div className="relative overflow-hidden px-6 pt-6 pb-4">
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${currentCatConfig?.color || "#C9A55C"} 0%, transparent 60%)`,
            }}
          />
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-xl"
                style={{
                  backgroundColor: `${currentCatConfig?.color || "#C9A55C"}15`,
                  color: currentCatConfig?.color || "#C9A55C",
                }}
              >
                <CategoryIcon size={20} />
              </div>
              <div>
                <DialogTitle className="font-[family-name:var(--font-display)] text-xl">
                  {isEditing ? "Editar entrada" : "Nueva entrada"}
                </DialogTitle>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  {isEditing ? `Editando en ${currentCatConfig?.label}` : "Agrega informacion al wiki"}
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-2 space-y-5">
          {/* Category selector - visual pills */}
          {!isEditing && (
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block">
                Categoria
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {WIKI_CATEGORIES.map((c) => {
                  const CatIcon = CATEGORY_ICONS[c.value]
                  const isSelected = category === c.value
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                        isSelected
                          ? "bg-white shadow-md scale-[1.02]"
                          : "bg-white/50 border-transparent hover:bg-white/80"
                      }`}
                      style={isSelected ? { borderColor: `${c.color}40`, color: c.color } : {}}
                    >
                      <div
                        className="p-1.5 rounded-lg"
                        style={{
                          backgroundColor: isSelected ? `${c.color}15` : "var(--muted)",
                          color: isSelected ? c.color : "var(--muted-foreground)",
                        }}
                      >
                        <CatIcon size={14} />
                      </div>
                      <span className={isSelected ? "" : "text-muted-foreground"}>
                        {c.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Titulo */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Titulo *
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Correo empresarial, Idea coleccion verano..."
              disabled={loading}
              className="h-11 bg-white/70 border-white/60"
            />
          </div>

          {/* === Campos de credenciales === */}
          {category === "credenciales" && (
            <div className="rounded-xl bg-red-500/[0.03] border border-red-500/10 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-600/80 flex items-center gap-1.5">
                <KeyRound size={12} />
                Datos de acceso
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1">Usuario / Email</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="usuario@mail.com"
                    disabled={loading}
                    className="bg-white/80"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1">Contrasena</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="bg-white/80"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1">PIN (opcional)</Label>
                  <Input
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="1234"
                    disabled={loading}
                    className="bg-white/80"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1">URL</Label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    disabled={loading}
                    className="bg-white/80"
                  />
                </div>
              </div>
            </div>
          )}

          {/* === Campos de tareas === */}
          {category === "tareas" && (
            <div className="rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600/80 flex items-center gap-1.5">
                <ListTodo size={12} />
                Estado de la tarea
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1">Estado</Label>
                  <Select value={taskStatus} onValueChange={setTaskStatus}>
                    <SelectTrigger className="w-full bg-white/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WIKI_TASK_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-1">Prioridad</Label>
                  <Select value={taskPriority} onValueChange={setTaskPriority}>
                    <SelectTrigger className="w-full bg-white/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WIKI_TASK_PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* === Campo URL para enlaces === */}
          {category === "enlaces" && (
            <div className="rounded-xl bg-violet-500/[0.03] border border-violet-500/10 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-violet-600/80 flex items-center gap-1.5">
                <Link2 size={12} />
                Enlace
              </h4>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                disabled={loading}
                className="bg-white/80"
              />
            </div>
          )}

          {/* Contenido */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              {category === "credenciales"
                ? "Notas adicionales"
                : category === "ideas"
                  ? "Describe tu idea"
                  : category === "tareas"
                    ? "Detalle de la tarea"
                    : category === "identidad"
                      ? "Informacion de identidad"
                      : category === "enlaces"
                        ? "Descripcion"
                        : "Contenido"}
            </Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                category === "ideas"
                  ? "Describe tu idea en detalle..."
                  : category === "tareas"
                    ? "Que hay que hacer..."
                    : category === "identidad"
                      ? "Describe la identidad visual, marca, etc..."
                      : "Escribe aqui..."
              }
              rows={category === "credenciales" ? 2 : 4}
              disabled={loading}
              className="bg-white/70 border-white/60"
            />
          </div>

          {/* Pin toggle */}
          <div className="flex items-center justify-between rounded-xl bg-gold/[0.04] border border-gold/10 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gold/10">
                <Pin size={14} className="text-gold" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Anclar entrada</Label>
                <p className="text-[11px] text-muted-foreground">Aparece primero en el listado</p>
              </div>
            </div>
            <Switch checked={isPinned} onCheckedChange={setIsPinned} />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="bg-white/60">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="shadow-[0_4px_12px_rgba(201,165,92,0.3)]">
            {loading && <Loader2 size={16} className="mr-1.5 animate-spin" />}
            {isEditing ? "Guardar cambios" : "Crear entrada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
