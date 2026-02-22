import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Columna izquierda — Formulario */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-cream relative">
        <div className="w-full max-w-[420px] animate-page-in">
          {/* Logo MIDAS — Título grande y dominante */}
          <div className="text-center mb-12">
            <div className="relative inline-block">
              <h1 className="font-[family-name:var(--font-display)] text-7xl sm:text-8xl font-bold text-gold tracking-[0.12em] leading-none">
                MIDAS
              </h1>
              {/* Línea decorativa dorada debajo del título */}
              <div className="mt-3 mx-auto w-16 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />
            </div>
            <p className="text-sm text-muted-foreground mt-4 tracking-[0.15em] uppercase font-medium">
              Sistema de Gestión
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1 tracking-wide">
              Casa Artemisa
            </p>
          </div>

          <LoginForm />

          {/* Créditos */}
          <div className="text-center mt-10 space-y-1.5">
            <p className="text-[11px] text-muted-foreground/50 tracking-wide">
              Desarrollado por{" "}
              <span className="text-muted-foreground/70 font-medium">
                Yeison Moreno
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground/30 tracking-wider">
              v1.0 — 2026
            </p>
          </div>
        </div>
      </div>

      {/* Columna derecha — Decorativa (solo desktop) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#0A0A0A]">
        {/* Fondo decorativo con gradiente */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111111] to-[#0A0A0A]" />

        {/* Patrón de puntos sutil */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, #C9A55C 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* MIDAS grande en el fondo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Letra M gigante como marca de agua */}
            <span className="font-[family-name:var(--font-display)] text-[280px] font-bold text-gold/[0.04] tracking-[0.15em] select-none leading-none">
              M
            </span>
            {/* Círculos concéntricos sobre la M */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-48 rounded-full border border-gold/10 animate-pulse" style={{ animationDuration: "4s" }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-32 rounded-full border border-gold/15" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-16 rounded-full bg-gold/10" />
            </div>
          </div>
        </div>

        {/* Líneas decorativas top & bottom */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

        {/* Línea vertical dorada izquierda */}
        <div className="absolute top-0 left-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gold/15 to-transparent" />

        {/* Frase motivacional */}
        <div className="absolute bottom-10 left-0 right-0 text-center">
          <p className="text-[11px] text-gold/25 tracking-[0.25em] uppercase">
            Todo lo que toca se convierte en oro
          </p>
        </div>

        {/* Esquina decorativa superior derecha */}
        <div className="absolute top-8 right-8">
          <div className="size-3 border border-gold/20 rotate-45" />
        </div>

        {/* Esquina decorativa inferior izquierda */}
        <div className="absolute bottom-8 left-8">
          <div className="size-3 border border-gold/20 rotate-45" />
        </div>
      </div>
    </div>
  )
}
