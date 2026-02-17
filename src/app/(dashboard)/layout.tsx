"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { AuthProvider } from "@/components/providers/auth-provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Contenido principal — respeta el ancho del sidebar */}
        <main className="lg:ml-[260px] pt-16 min-h-screen">
          <div className="p-4 md:p-6 lg:p-8 animate-page-in">
            {children}
          </div>
        </main>
      </div>
    </AuthProvider>
  )
}
