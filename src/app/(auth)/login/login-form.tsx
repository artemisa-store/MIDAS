"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error("Ingresa tu email y contraseña")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Shake animation en error
        setShake(true)
        setTimeout(() => setShake(false), 300)

        if (error.message.includes("Invalid login credentials")) {
          toast.error("Credenciales incorrectas", {
            description: "Verifica tu email y contraseña e intenta de nuevo.",
          })
        } else {
          toast.error("Error al iniciar sesión", {
            description: error.message,
          })
        }
        return
      }

      toast.success("Bienvenido a MIDAS")
      router.push("/")
      router.refresh()
    } catch {
      toast.error("Error inesperado", {
        description: "Intenta de nuevo en unos segundos.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-5", shake && "animate-shake")}
    >
      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-[13px] font-medium text-muted-foreground">
          Correo electrónico
        </Label>
        <div className="relative">
          <Mail
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="email"
            type="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-11 h-11 bg-white border-[1.5px] border-border focus:border-gold focus:ring-[3px] focus:ring-gold/15"
            disabled={loading}
            autoComplete="email"
            autoFocus
          />
        </div>
      </div>

      {/* Contraseña */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-[13px] font-medium text-muted-foreground">
          Contraseña
        </Label>
        <div className="relative">
          <Lock
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-11 pr-11 h-11 bg-white border-[1.5px] border-border focus:border-gold focus:ring-[3px] focus:ring-gold/15"
            disabled={loading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Botón de login */}
      <Button
        type="submit"
        className="w-full h-11 bg-gold hover:bg-gold-hover text-white font-semibold text-sm transition-all hover:shadow-[0_2px_8px_rgba(201,165,92,0.3)] active:scale-[0.98]"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin mr-2" />
            Iniciando sesión...
          </>
        ) : (
          "Iniciar sesión"
        )}
      </Button>

      {/* Link para recuperar contraseña */}
      <p className="text-center">
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-gold transition-colors"
          onClick={() =>
            toast.info("Contacta al administrador para restablecer tu contraseña.")
          }
        >
          ¿Olvidaste tu contraseña?
        </button>
      </p>
    </form>
  )
}
