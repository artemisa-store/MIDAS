"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Plus,
  Search,
  BookOpen,
  Pin,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  Eye,
  EyeOff,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  FileText,
  KeyRound,
  Lightbulb,
  ListTodo,
  Link2,
  Palette,
  Shield,
  Sparkles,
  CheckCircle2,
  Clock,
  CircleDot,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { formatRelativeTime } from "@/lib/format"
import { WIKI_CATEGORIES } from "@/lib/constants"
import { WikiEntryFormDialog } from "./wiki-entry-form-dialog"
import type { WikiEntry, WikiCategory } from "@/lib/types"

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  notas: FileText,
  credenciales: KeyRound,
  ideas: Lightbulb,
  tareas: ListTodo,
  enlaces: Link2,
  identidad: Palette,
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  notas: "from-blue-500/20 to-blue-600/5",
  credenciales: "from-red-500/20 to-red-600/5",
  ideas: "from-amber-400/20 to-amber-500/5",
  tareas: "from-emerald-500/20 to-emerald-600/5",
  enlaces: "from-violet-500/20 to-violet-600/5",
  identidad: "from-gold/20 to-gold/5",
}

const CATEGORY_ICON_BG: Record<string, string> = {
  notas: "bg-blue-500/10 text-blue-600",
  credenciales: "bg-red-500/10 text-red-600",
  ideas: "bg-amber-400/10 text-amber-600",
  tareas: "bg-emerald-500/10 text-emerald-600",
  enlaces: "bg-violet-500/10 text-violet-600",
  identidad: "bg-gold/10 text-gold",
}

const TASK_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string; dotColor: string }> = {
  pendiente: { label: "Pendiente", icon: Clock, className: "bg-warning/10 text-warning border-warning/20", dotColor: "bg-warning shadow-[0_0_8px_rgba(217,119,6,0.6)]" },
  en_progreso: { label: "En progreso", icon: CircleDot, className: "bg-info/10 text-info border-info/20", dotColor: "bg-info shadow-[0_0_8px_rgba(37,99,235,0.6)]" },
  completada: { label: "Completada", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20", dotColor: "bg-success shadow-[0_0_8px_rgba(5,150,105,0.6)]" },
}

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  baja: { label: "Baja", className: "text-muted-foreground bg-muted" },
  media: { label: "Media", className: "text-warning bg-warning/10" },
  alta: { label: "Alta", className: "text-error bg-error/10" },
}

export default function WikiPage() {
  const supabase = createClient()
  const { user } = useAuth()

  const [entries, setEntries] = useState<WikiEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("todas")
  const [showArchived, setShowArchived] = useState(false)

  // Dialog states
  const [showForm, setShowForm] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<WikiEntry | null>(null)
  const [defaultCategory, setDefaultCategory] = useState<WikiCategory | undefined>()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<WikiEntry | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Password visibility & copy
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Expanded cards (for content preview)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})

  // Fetch
  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("wiki_entries")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false })

    if (data) setEntries(data as WikiEntry[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Stats por categoria
  const categoryStats = useMemo(() => {
    const active = entries.filter((e) => !e.is_archived)
    const counts: Record<string, number> = {}
    WIKI_CATEGORIES.forEach((c) => {
      counts[c.value] = active.filter((e) => e.category === c.value).length
    })
    return counts
  }, [entries])

  const totalActive = useMemo(() => entries.filter((e) => !e.is_archived).length, [entries])

  // Filtrado
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (!showArchived && e.is_archived) return false
      if (showArchived && !e.is_archived) return false
      if (activeCategory !== "todas" && e.category !== activeCategory) return false

      const q = search.toLowerCase()
      if (q) {
        const matchesTitle = e.title.toLowerCase().includes(q)
        const matchesContent = (e.content || "").toLowerCase().includes(q)
        const matchesMeta = JSON.stringify(e.metadata || {}).toLowerCase().includes(q)
        if (!matchesTitle && !matchesContent && !matchesMeta) return false
      }

      return true
    })
  }, [entries, search, activeCategory, showArchived])

  const pinnedEntries = filtered.filter((e) => e.is_pinned)
  const unpinnedEntries = filtered.filter((e) => !e.is_pinned)

  // Actions
  const openCreate = (category?: WikiCategory) => {
    setSelectedEntry(null)
    setDefaultCategory(category)
    setShowForm(true)
  }

  const openEdit = (entry: WikiEntry) => {
    setSelectedEntry(entry)
    setDefaultCategory(undefined)
    setShowForm(true)
  }

  const togglePin = async (entry: WikiEntry) => {
    const { error } = await supabase
      .from("wiki_entries")
      .update({ is_pinned: !entry.is_pinned })
      .eq("id", entry.id)
    if (error) {
      toast.error("Error al actualizar")
      return
    }
    toast.success(entry.is_pinned ? "Desanclado" : "Anclado")
    fetchEntries()
  }

  const toggleArchive = async (entry: WikiEntry) => {
    const { error } = await supabase
      .from("wiki_entries")
      .update({ is_archived: !entry.is_archived })
      .eq("id", entry.id)
    if (error) {
      toast.error("Error al archivar")
      return
    }
    toast.success(entry.is_archived ? "Restaurado" : "Archivado")
    fetchEntries()
  }

  const handleDelete = async () => {
    if (!entryToDelete) return
    setDeleteLoading(true)
    const { error } = await supabase
      .from("wiki_entries")
      .delete()
      .eq("id", entryToDelete.id)
    if (error) {
      toast.error("Error al eliminar")
      setDeleteLoading(false)
      return
    }
    toast.success("Entrada eliminada")
    setShowDeleteConfirm(false)
    setEntryToDelete(null)
    setDeleteLoading(false)
    fetchEntries()
  }

  const confirmDelete = (entry: WikiEntry) => {
    setEntryToDelete(entry)
    setShowDeleteConfirm(true)
  }

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldKey)
    toast.success("Copiado al portapapeles")
    setTimeout(() => setCopiedField(null), 2000)
  }

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Credential field renderer
  const renderCredField = (label: string, value: string, fieldKey: string, isSecret: boolean = false) => {
    const isVisible = visiblePasswords[fieldKey]
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/60 border border-white/80 shadow-sm">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-foreground">
            {isSecret && !isVisible ? "••••••••" : value}
          </span>
          {isSecret && (
            <button
              onClick={() => setVisiblePasswords((p) => ({ ...p, [fieldKey]: !p[fieldKey] }))}
              className="p-1 rounded-md hover:bg-black/5 text-muted-foreground hover:text-foreground transition-all"
            >
              {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          )}
          <button
            onClick={() => copyToClipboard(value, fieldKey)}
            className="p-1 rounded-md hover:bg-black/5 text-muted-foreground hover:text-foreground transition-all"
          >
            {copiedField === fieldKey ? <Check size={13} className="text-success" /> : <Copy size={13} />}
          </button>
        </div>
      </div>
    )
  }

  // Render card
  const renderCard = (entry: WikiEntry, index: number) => {
    const categoryConfig = WIKI_CATEGORIES.find((c) => c.value === entry.category)
    const CategoryIcon = CATEGORY_ICONS[entry.category] || FileText
    const gradient = CATEGORY_GRADIENTS[entry.category] || "from-gray-500/20 to-gray-600/5"
    const iconBg = CATEGORY_ICON_BG[entry.category] || "bg-gray-500/10 text-gray-600"
    const isExpanded = expandedCards[entry.id]

    return (
      <div
        key={entry.id}
        className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/60 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-500 group relative overflow-hidden flex flex-col"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />

        {/* Pin indicator ribbon */}
        {entry.is_pinned && (
          <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
            <div className="absolute top-2 right-[-20px] w-[80px] bg-gold text-white text-[9px] font-bold uppercase tracking-wider text-center py-0.5 rotate-45 shadow-sm">
              Fijada
            </div>
          </div>
        )}

        <div className="p-5 flex flex-col flex-1 relative z-10">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className={`p-2.5 rounded-xl ${iconBg} shrink-0 group-hover:scale-110 transition-transform duration-300`}>
              <CategoryIcon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-[15px] text-foreground line-clamp-1 group-hover:text-foreground/90 transition-colors">
                {entry.title}
              </h3>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.12em] mt-1 inline-block"
                style={{ color: categoryConfig?.color }}
              >
                {categoryConfig?.label}
              </span>
            </div>
          </div>

          {/* Content by category */}
          <div className="flex-1 min-h-0">
            {/* === CREDENCIALES === */}
            {entry.category === "credenciales" && (
              <div className="space-y-1.5">
                {entry.metadata?.username && renderCredField("Usuario", entry.metadata.username, `user-${entry.id}`)}
                {entry.metadata?.password && renderCredField("Clave", entry.metadata.password, `pass-${entry.id}`, true)}
                {entry.metadata?.pin && renderCredField("PIN", entry.metadata.pin, `pin-${entry.id}`, true)}
                {entry.metadata?.url && (
                  <a
                    href={entry.metadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 py-2 px-3 rounded-xl bg-info/5 border border-info/10 text-info hover:bg-info/10 transition-colors text-xs font-semibold group/link"
                  >
                    <ExternalLink size={13} className="shrink-0 group-hover/link:rotate-12 transition-transform" />
                    <span className="truncate">{entry.metadata.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                  </a>
                )}
              </div>
            )}

            {/* === TAREAS === */}
            {entry.category === "tareas" && (
              <div className="space-y-3">
                {entry.metadata?.status && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${TASK_STATUS_CONFIG[entry.metadata.status]?.dotColor || ""}`} />
                      <span className="text-sm font-bold">
                        {TASK_STATUS_CONFIG[entry.metadata.status]?.label || entry.metadata.status}
                      </span>
                    </div>
                    {entry.metadata?.priority && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-0 ${PRIORITY_CONFIG[entry.metadata.priority]?.className || ""}`}
                      >
                        {PRIORITY_CONFIG[entry.metadata.priority]?.label}
                      </Badge>
                    )}
                  </div>
                )}
                {entry.content && (
                  <p className={`text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed ${isExpanded ? "" : "line-clamp-3"}`}>
                    {entry.content}
                  </p>
                )}
              </div>
            )}

            {/* === ENLACES === */}
            {entry.category === "enlaces" && (
              <div className="space-y-2">
                {entry.metadata?.url && (
                  <a
                    href={entry.metadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-xl bg-violet-500/5 border border-violet-500/10 text-violet-600 hover:bg-violet-500/10 transition-all text-xs font-semibold group/link"
                  >
                    <div className="p-1.5 bg-violet-500/10 rounded-lg shrink-0 group-hover/link:scale-110 transition-transform">
                      <ExternalLink size={14} />
                    </div>
                    <span className="truncate">{entry.metadata.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                  </a>
                )}
                {entry.content && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed line-clamp-2">
                    {entry.content}
                  </p>
                )}
              </div>
            )}

            {/* === NOTAS / IDEAS / IDENTIDAD === */}
            {(entry.category === "notas" || entry.category === "ideas" || entry.category === "identidad") && entry.content && (
              <div>
                <p className={`text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed ${isExpanded ? "" : "line-clamp-4"}`}>
                  {entry.content}
                </p>
                {entry.content.length > 200 && (
                  <button
                    onClick={() => toggleExpand(entry.id)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-gold hover:text-gold-hover mt-2 transition-colors"
                  >
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {isExpanded ? "Ver menos" : "Ver mas"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {formatRelativeTime(entry.updated_at)}
            </span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <button
                onClick={() => togglePin(entry)}
                className={`p-1.5 rounded-lg hover:bg-black/5 transition-all ${entry.is_pinned ? "text-gold" : "text-muted-foreground hover:text-foreground"}`}
                title={entry.is_pinned ? "Desanclar" : "Anclar"}
              >
                <Pin size={14} className={entry.is_pinned ? "fill-gold" : ""} />
              </button>
              <button
                onClick={() => openEdit(entry)}
                className="p-1.5 rounded-lg hover:bg-black/5 text-muted-foreground hover:text-foreground transition-all"
                title="Editar"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => toggleArchive(entry)}
                className="p-1.5 rounded-lg hover:bg-black/5 text-muted-foreground hover:text-foreground transition-all"
                title={entry.is_archived ? "Restaurar" : "Archivar"}
              >
                {entry.is_archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              </button>
              <button
                onClick={() => confirmDelete(entry)}
                className="p-1.5 rounded-lg hover:bg-error/10 text-muted-foreground hover:text-error transition-all"
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-page-in pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-white/40 backdrop-blur-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 isolate group">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/4 w-[400px] h-[400px] bg-gold/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-gold/15 transition-colors duration-1000" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[300px] h-[300px] bg-info/8 rounded-full blur-[60px] pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-gold/10 text-gold text-xs font-bold uppercase tracking-widest mb-3 border border-gold/20 shadow-sm">
              <BookOpen size={12} /> Base de Conocimiento
            </span>
            <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
              Wiki <span className="bg-clip-text text-transparent bg-gradient-to-r from-gold to-[#B8923E]">Artemisa</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium">
              Notas, credenciales, ideas y recursos del negocio
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)} className="bg-white/60 backdrop-blur-sm border-white/80 hover:bg-white/90">
              {showArchived ? <ArchiveRestore size={15} className="mr-1.5" /> : <Archive size={15} className="mr-1.5" />}
              {showArchived ? "Ver activos" : "Archivados"}
            </Button>
            <Button onClick={() => openCreate()} className="shadow-[0_4px_12px_rgba(201,165,92,0.3)]">
              <Plus size={15} className="mr-1.5" />
              Nueva entrada
            </Button>
          </div>
        </div>
      </div>

      {/* Category Selector - Bento Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* All */}
        <button
          onClick={() => setActiveCategory("todas")}
          className={`relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 border group/cat ${
            activeCategory === "todas"
              ? "bg-white/90 border-gold/30 shadow-[0_4px_20px_rgba(201,165,92,0.15)] scale-[1.02]"
              : "bg-white/50 border-white/60 hover:bg-white/80 hover:shadow-md hover:-translate-y-0.5"
          }`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br from-gold/10 to-transparent opacity-0 ${activeCategory === "todas" ? "opacity-100" : "group-hover/cat:opacity-100"} transition-opacity pointer-events-none`} />
          <div className="relative z-10">
            <div className={`p-2 rounded-xl w-fit mb-2 ${activeCategory === "todas" ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground"} transition-colors`}>
              <Sparkles size={16} />
            </div>
            <p className={`text-xs font-bold ${activeCategory === "todas" ? "text-gold" : "text-muted-foreground"} transition-colors`}>Todas</p>
            <p className="text-lg font-[family-name:var(--font-display)] font-extrabold text-foreground tabular-nums">{totalActive}</p>
          </div>
        </button>

        {WIKI_CATEGORIES.map((cat) => {
          const CatIcon = CATEGORY_ICONS[cat.value]
          const isActive = activeCategory === cat.value
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 border group/cat ${
                isActive
                  ? "bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.08)] scale-[1.02]"
                  : "bg-white/50 border-white/60 hover:bg-white/80 hover:shadow-md hover:-translate-y-0.5"
              }`}
              style={isActive ? { borderColor: `${cat.color}40` } : {}}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${CATEGORY_GRADIENTS[cat.value]} opacity-0 ${isActive ? "opacity-100" : "group-hover/cat:opacity-100"} transition-opacity pointer-events-none`} />
              <div className="relative z-10">
                <div
                  className={`p-2 rounded-xl w-fit mb-2 transition-all ${isActive ? "scale-110" : ""}`}
                  style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                >
                  <CatIcon size={16} />
                </div>
                <p className="text-xs font-bold text-muted-foreground transition-colors" style={isActive ? { color: cat.color } : {}}>
                  {cat.label}
                </p>
                <p className="text-lg font-[family-name:var(--font-display)] font-extrabold text-foreground tabular-nums">
                  {categoryStats[cat.value] || 0}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar notas, credenciales, ideas..."
          className="pl-10 h-11 bg-white/70 backdrop-blur-sm border-white/60 shadow-sm focus:shadow-gold rounded-xl text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[200px] rounded-2xl skeleton-shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-5 rounded-3xl bg-gold/5 mb-5 border border-gold/10">
            <BookOpen size={40} className="text-gold/40" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1.5">
            {showArchived ? "Sin entradas archivadas" : "Sin entradas"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {entries.length === 0
              ? "Crea tu primera entrada en el wiki para empezar a organizar la informacion de Casa Artemisa."
              : "No se encontraron entradas con los filtros aplicados."}
          </p>
          {entries.length === 0 && (
            <Button className="mt-5 shadow-[0_4px_12px_rgba(201,165,92,0.3)]" onClick={() => openCreate()}>
              <Plus size={16} className="mr-1.5" />
              Crear primera entrada
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned section */}
          {pinnedEntries.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-gold/10">
                  <Pin size={13} className="text-gold fill-gold" />
                </div>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  Fijadas
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-gold/20 to-transparent" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedEntries.map((entry, i) => renderCard(entry, i))}
              </div>
            </div>
          )}

          {/* Rest */}
          {unpinnedEntries.length > 0 && (
            <div>
              {pinnedEntries.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    {activeCategory === "todas" ? "Todas las entradas" : WIKI_CATEGORIES.find((c) => c.value === activeCategory)?.label || "Entradas"}
                  </h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpinnedEntries.map((entry, i) => renderCard(entry, i))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick add floating buttons when viewing a specific category */}
      {activeCategory !== "todas" && !loading && (
        <div className="fixed bottom-8 right-8 z-30">
          <Button
            onClick={() => openCreate(activeCategory as WikiCategory)}
            className="h-14 w-14 rounded-2xl shadow-[0_8px_30px_rgba(201,165,92,0.4)] hover:shadow-[0_12px_40px_rgba(201,165,92,0.5)] hover:scale-110 transition-all duration-300 p-0"
          >
            <Plus size={24} />
          </Button>
        </div>
      )}

      {/* Form dialog */}
      <WikiEntryFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        entry={selectedEntry}
        onCompleted={fetchEntries}
        defaultCategory={defaultCategory}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Eliminar entrada"
        description={`Estas seguro de eliminar "${entryToDelete?.title}"? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  )
}
