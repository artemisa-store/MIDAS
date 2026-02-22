"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { AuthProvider } from "@/components/providers/auth-provider"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <AuthProvider>
      <div className="min-h-screen bg-background text-foreground selection:bg-gold/30 selection:text-gold-hover">
        {/* Decorative background element for premium feel across layout */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[600px] bg-gold/5 rounded-full blur-[120px] opacity-70" />
          <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-info/5 rounded-full blur-[100px] opacity-50" />
        </div>

        <div className="relative z-10">
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            collapsed={sidebarCollapsed}
            onCollapse={setSidebarCollapsed}
          />
          <Topbar
            onMenuClick={() => setSidebarOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
          />

          {/* Contenido principal — respeta el ancho del sidebar dinámicamente */}
          <main
            className={cn(
              "pt-16 min-h-screen transition-all duration-300 ease-in-out",
              sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"
            )}
          >
            <div className="p-4 md:p-6 lg:p-8 animate-page-in">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthProvider>
  )
}
