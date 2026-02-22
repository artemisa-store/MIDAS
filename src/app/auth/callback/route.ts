import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Maneja el callback de OAuth (Microsoft, etc.)
// Supabase redirige aquí con un ?code= que intercambiamos por sesión
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si falla, redirigir al login con error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
