"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Bell, MessageSquare, BookOpen, Shield, Settings, LogOut, Menu, X, User } from "lucide-react"
import { toast } from "sonner"
import { clearAuthStorage, getStoredAuthData } from "@/lib/auth-context"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  
  // Get student data from sessionStorage (already verified by dashboard page)
  const studentData = getStoredAuthData()

  // ============ LOGOUT HANDLER ============
  const handleLogout = async () => {
    try {
      clearAuthStorage()
      toast.success("Logged out successfully")
      
      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100))
      router.push('/login')
    } catch (error) {
      console.error("Logout failed:", error)
      toast.error("Logout failed. Please try again.")
    }
  }

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
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-card/80 backdrop-blur-sm border border-border hover:bg-card transition-colors shadow-sm"
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 w-64 bg-card/80 backdrop-blur-sm border-r border-border/60 p-6 overflow-y-auto transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 font-bold text-lg mb-8 pt-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center text-primary-foreground text-sm font-bold shadow-sm">
            VIT
          </div>
          <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            VIT Chennai
          </span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 mb-8">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
                            (item.href !== "/dashboard" && pathname.startsWith(item.href))
            
            return (
              <Link key={item.label} href={item.href} onClick={() => setSidebarOpen(false)}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={`w-full justify-start gap-3 h-11 ${
                    isActive 
                      ? "bg-secondary/70 text-foreground font-semibold" 
                      : "text-foreground/70 hover:text-foreground hover:bg-secondary/30"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* User Profile Section */}
        <div className="border-t border-border/40 pt-4 mt-auto">
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-default">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center text-accent font-semibold border border-accent/20">
              {studentData?.name ? (
                studentData.name.charAt(0).toUpperCase()
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {studentData?.name || "Student"}
              </p>
              <p className="text-xs text-foreground/60 truncate">
                {studentData?.registrationNo || studentData?.email || "VIT Student"}
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start gap-3 h-11 text-foreground/60 hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
            <span className="ml-auto text-xs text-foreground/40">
              v1.0
            </span>
          </Button>
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-4 border-t border-border/30">
          <p className="text-xs text-foreground/40 text-center">
            {studentData?.lastLogin 
              ? `Last login: ${new Date(studentData.lastLogin).toLocaleDateString()}`
              : "Secure VTOP Portal"
            }
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gradient-to-b from-background to-secondary/5">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}