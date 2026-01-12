"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Bell, MessageSquare, BookOpen, Shield, Settings, LogOut, Menu, X } from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Bell, label: "Announcements", href: "/announcements" },
    { icon: MessageSquare, label: "Communication", href: "/communication" },
    { icon: BookOpen, label: "Resources", href: "/resources" },
    { icon: Shield, label: "Safety & Support", href: "/safety" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-card/50 border border-border/60 hover:bg-card/70 transition-colors"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-card/50 border-r border-border/60 p-6 overflow-y-auto transition-all duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-2 font-bold text-lg mb-8 pt-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
            C
          </div>
          <span>VIT Chennai</span>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 mb-8">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.label} href={item.href}>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 hover:bg-secondary/50 text-foreground/70 hover:text-foreground"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className="border-t border-border/40 pt-4 mt-auto">
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-secondary/30">
            <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center text-accent font-semibold">
                {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
                <p className="font-semibold text-sm">{user?.name || "User"}</p>
                <p className="text-xs text-foreground/60">{user?.email}</p>
            </div>
          </div>
          <Button
              onClick={() => logout()}
            variant="ghost"
            className="w-full justify-start gap-2 text-foreground/60 hover:text-foreground hover:bg-secondary/50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
