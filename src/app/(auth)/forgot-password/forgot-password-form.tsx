"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail, Loader2, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function ForgotPasswordForm() {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [shake, setShake] = useState(false)
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email) {
            toast.error("Ingresa tu correo electrónico")
            setShake(true)
            setTimeout(() => setShake(false), 300)
            return
        }

        setLoading(true)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
            })

            if (error) {
                setShake(true)
                setTimeout(() => setShake(false), 300)

                toast.error("Error al solicitar recuperación", {
                    description: error.message,
                })
                return
            }

            setSuccess(true)
            toast.success("Correo enviado", {
                description: "Revisa tu bandeja de entrada para continuar con la recuperación.",
            })
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
                    <Mail className="w-6 h-6 text-gold" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold tracking-tight">Revisa tu correo</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Hemos enviado un enlace de recuperación a <br />
                        <span className="font-medium text-foreground">{email}</span>
                    </p>
                </div>
                <div className="pt-4">
                    <Link
                        href="/login"
                        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-gold transition-colors"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al inicio de sesión
                    </Link>
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
                <h2 className="text-xl font-bold tracking-tight">Recuperar contraseña</h2>
                <p className="text-sm text-muted-foreground">
                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu acceso.
                </p>
            </div>

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

            {/* Botón de Enviar */}
            <Button
                type="submit"
                className="w-full h-11 bg-gold hover:bg-gold-hover text-white font-semibold text-sm transition-all hover:shadow-[0_2px_8px_rgba(201,165,92,0.3)] active:scale-[0.98]"
                disabled={loading}
            >
                {loading ? (
                    <>
                        <Loader2 size={18} className="animate-spin mr-2" />
                        Enviando enlace...
                    </>
                ) : (
                    "Enviar enlace de recuperación"
                )}
            </Button>

            {/* Link para volver */}
            <div className="text-center pt-2">
                <Link
                    href="/login"
                    className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-gold transition-colors"
                >
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                    Volver al inicio de sesión
                </Link>
            </div>
        </form>
    )
}
