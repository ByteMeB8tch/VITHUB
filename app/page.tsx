"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, BookOpen, Users, AlertCircle, Zap, Shield, Calendar } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"

export default function LandingPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard if already logged in
    if (!isLoading && user) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return null
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 glass-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
              C
            </div>
            <span className="hidden sm:inline">VIT Chennai Hub</span>
          </div>
          <div className="flex items-center gap-4">
              <Link href="/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link href="#features">
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Explore Features
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-6 inline-block">
            <span className="px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-sm font-medium">
              Now Available for All Students
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 text-balance">
            Welcome to <span className="gradient-text">VIT Chennai</span> <br />
            <span className="text-foreground/90">Digital Campus Hub</span>
          </h1>
          <p className="text-lg sm:text-xl text-foreground/70 mb-8 max-w-2xl mx-auto text-balance">
            Your gateway to VIT Chennai campus life. Access academics, resources, announcements, and campus services—all in one unified platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="border-border/60 hover:bg-secondary/30 bg-transparent">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/5 border-y border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Powerful Features for Modern Campuses</h2>
            <p className="text-foreground/60 text-lg">Everything you need to thrive on campus</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature Cards */}
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Communication Hub"
              description="Centralized announcements, instant messaging, and community engagement."
            />
            <FeatureCard
              icon={<BookOpen className="h-6 w-6" />}
              title="Resource Management"
              description="Book labs, library slots, and seminar halls with real-time availability."
            />
            <FeatureCard
              icon={<Calendar className="h-6 w-6" />}
              title="Productivity Tools"
              description="Track assignments, manage tasks, and stay on top of deadlines."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Campus Safety"
              description="Emergency alerts, SOS features, and quick issue reporting."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Smart Notifications"
              description="Stay updated with intelligent, personalized alerts and reminders."
            />
            <FeatureCard
              icon={<AlertCircle className="h-6 w-6" />}
              title="Admin Dashboard"
              description="Manage resources, post announcements, and view campus analytics."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Connect?</h2>
          <p className="text-foreground/60 text-lg mb-8">
            Join thousands of students and faculty already using CampusHub to improve their campus experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto">
                Launch Dashboard
              </Button>
            </Link>
            <Link href="#features">
              <Button
                variant="outline"
                size="lg"
                className="border-border/60 hover:bg-secondary/30 w-full sm:w-auto bg-transparent"
              >
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-4 sm:px-6 lg:px-8 bg-secondary/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center text-foreground/60 text-sm">
          <p>&copy; 2026 CampusHub. All rights reserved.</p>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="bg-card/50 border-border/60 hover:border-accent/40 hover:bg-card/70 transition-smooth group">
      <CardHeader>
        <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center text-accent mb-4 group-hover:bg-accent/30 transition-colors">
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-foreground/70">{description}</p>
      </CardContent>
    </Card>
  )
}
