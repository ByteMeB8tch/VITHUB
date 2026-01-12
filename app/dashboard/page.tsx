"use client"

import { useState } from "react"
import DashboardLayout from "@/components/dashboard/layout"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, FileText, Bell, AlertCircle, BookOpen, Wrench } from "lucide-react"

export default function Dashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")

  const userName = user?.name || "User"
  const userEmail = user?.email || ""

  const stats = [
    { icon: Calendar, label: "Upcoming Classes", value: "5", color: "text-blue-400" },
    { icon: Bell, label: "New Announcements", value: "3", color: "text-cyan-400" },
    { icon: FileText, label: "Pending Tasks", value: "8", color: "text-amber-400" },
    { icon: AlertCircle, label: "Alerts", value: "1", color: "text-red-400" },
  ]

  const schedule = [
    { time: "09:00 AM", class: "Computer Networks", room: "SJT 401", duration: "1h" },
    { time: "10:00 AM", class: "Machine Learning", room: "SJT 502", duration: "1h" },
    { time: "11:00 AM", class: "Software Engineering", room: "MB 203", duration: "1h" },
    { time: "02:00 PM", class: "Cloud Computing Lab", room: "Lab 301", duration: "2h" },
  ]

  const announcements = [
    { title: "Mid-Term Exam Schedule Released", type: "Academic", time: "2 hours ago" },
    { title: "Tech Fest 2026 - Riviera Registration Open", type: "Event", time: "5 hours ago" },
    { title: "Library Extended Hours During Exams", type: "Academic", time: "1 day ago" },
  ]

  return (
    <ProtectedRoute>
      <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {userName}</h1>
            <p className="text-foreground/60">Tuesday, January 12, 2026</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button className="flex-1 sm:flex-none bg-accent hover:bg-accent/90 text-accent-foreground">
              <BookOpen className="h-4 w-4 mr-2" />
              Book Resource
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none border-border/60 bg-transparent">
              <Wrench className="h-4 w-4 mr-2" />
              Report Issue
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="bg-card/50 border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-foreground/60 text-sm mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedule Section */}
          <div className="lg:col-span-2">
            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle>Today's Schedule</CardTitle>
                <CardDescription>Your classes and activities for today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {schedule.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-16">
                        <p className="font-semibold text-accent">{item.time}</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{item.class}</p>
                        <p className="text-sm text-foreground/60">{item.room}</p>
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0">
                        {item.duration}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Announcements */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start border-border/60 bg-transparent">
                  View Notices
                </Button>
                <Button variant="outline" className="w-full justify-start border-border/60 bg-transparent">
                  My Tasks
                </Button>
                <Button variant="outline" className="w-full justify-start border-border/60 bg-transparent">
                  View Grades
                </Button>
              </CardContent>
            </Card>

            {/* Recent Announcements */}
            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">Recent Announcements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {announcements.map((ann, idx) => (
                  <div key={idx} className="border-b border-border/40 pb-3 last:border-0">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-semibold text-sm">{ann.title}</p>
                      <Badge variant="secondary" className="text-xs">
                        {ann.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground/50">{ann.time}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
