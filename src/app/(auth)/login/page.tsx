import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Columna izquierda — Formulario */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-cream">
        <div className="w-full max-w-[400px] animate-page-in">
          {/* Logo MIDAS */}
          <div className="text-center mb-10">
            <h1 className="font-serif text-4xl font-bold text-gold tracking-[0.08em]">
              MIDAS<span className="text-gold/60">·</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 tracking-wide">
              Casa Artemisa
            </p>
          </div>

          <LoginForm />

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground/60 mt-8">
            Sistema de gestión contable — Casa Artemisa
          </p>
        </div>
      </div>

      {/* Columna derecha — Decorativa (solo desktop) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#0A0A0A]">
        {/* Fondo decorativo con gradiente y patrón sutil */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#141414] to-[#0A0A0A]" />

        {/* Elemento decorativo dorado */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Círculo decorativo grande */}
            <div className="size-64 rounded-full border border-gold/10" />
            <div className="absolute inset-4 rounded-full border border-gold/15" />
            <div className="absolute inset-8 rounded-full border border-gold/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-6xl font-bold text-gold/30 tracking-[0.12em]">
                M
              </span>
            </div>
          </div>
        </div>

        {/* Líneas decorativas sutiles */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

        {/* Texto decorativo */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-[11px] text-gold/30 tracking-[0.2em] uppercase">
            Todo lo que toca se convierte en oro
          </p>
        </div>
      </div>
    </div>
  )
}
