"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function ResetPasswordForm() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [shake, setShake] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!password || !confirmPassword) {
            toast.error("Por favor, completa ambos campos")
            setShake(true)
            setTimeout(() => setShake(false), 300)
            return
        }

        if (password !== confirmPassword) {
            toast.error("Las contraseñas no coinciden")
            setShake(true)
            setTimeout(() => setShake(false), 300)
            return
        }

        if (password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres")
            setShake(true)
            setTimeout(() => setShake(false), 300)
            return
        }

        setLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) {
                setShake(true)
                setTimeout(() => setShake(false), 300)
                toast.error("Error al actualizar la contraseña", {
                    description: error.message,
                })
                return
            }

            setSuccess(true)
            toast.success("Contraseña actualizada con éxito")
        } catch {
            toast.error("Error inesperado", {
                description: "Intenta de nuevo en unos segundos.",
            })
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="space-y-6 text-center animate-in fade-in zoom-in duration-500">
                <div className="mx-auto w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-gold" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold tracking-tight">¡Contraseña Actualizada!</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Tu nueva credencial de acceso ha sido guardada.
                    </p>
                </div>
                <div className="pt-4">
                    <Button
                        onClick={() => router.push("/login")}
                        className="w-full bg-gold hover:bg-gold-hover text-white transition-all"
                    >
                        Ir al Inicio de Sesión
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <form
            onSubmit={handleSubmit}
            className={cn("space-y-5", shake && "animate-shake")}
        >
            <div className="space-y-2 text-center mb-6">
                <h2 className="text-xl font-bold tracking-tight">Crea tu nueva contraseña</h2>
                <p className="text-sm text-muted-foreground">
                    Ingresa y confirma tu nueva credencial de acceso.
                </p>
            </div>

            {/* Nueva Contraseña */}
            <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[13px] font-medium text-muted-foreground">
                    Nueva Contraseña
                </Label>
                <div className="relative">
                    <Lock
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-11 pr-11 h-11 bg-white border-[1.5px] border-border focus:border-gold focus:ring-[3px] focus:ring-gold/15"
                        disabled={loading}
                        autoFocus
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

            {/* Confirmar Contraseña */}
            <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-[13px] font-medium text-muted-foreground">
                    Confirmar Contraseña
                </Label>
                <div className="relative">
                    <Lock
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-11 pr-11 h-11 bg-white border-[1.5px] border-border focus:border-gold focus:ring-[3px] focus:ring-gold/15"
                        disabled={loading}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                    >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            {/* Botón de Enviar */}
            <Button
                type="submit"
                className="w-full h-11 bg-gold hover:bg-gold-hover text-white font-semibold text-sm transition-all hover:shadow-[0_2px_8px_rgba(201,165,92,0.3)] active:scale-[0.98]"
                disabled={loading}
            >
                {loading ? (
                    <>
                        <Loader2 size={18} className="animate-spin mr-2" />
                        Guardando...
                    </>
                ) : (
                    "Guardar nueva contraseña"
                )}
            </Button>

            {/* Link para volver en caso de error/arrepentimiento */}
            <div className="text-center pt-2">
                <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-gold transition-colors"
                >
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                    Cancelar y volver
                </button>
            </div>
        </form>
    )
}
