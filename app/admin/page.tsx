"use client"

import { useState } from "react"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Users, Bell, BookOpen, AlertCircle, Plus, Edit, TrendingUp } from "lucide-react"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  const stats = [
    { label: "Total Students", value: "2,543", change: "+12%", icon: Users },
    { label: "Announcements", value: "87", change: "+5", icon: Bell },
    { label: "Resources", value: "24", change: "100% Booked", icon: BookOpen },
    { label: "Reports", value: "12", change: "+3", icon: AlertCircle },
  ]

  const recentReports = [
    { id: 1, type: "Maintenance", description: "Broken window in Lab 201", status: "Pending", priority: "High" },
    { id: 2, type: "Safety", description: "Unsafe lighting condition", status: "In Progress", priority: "High" },
    { id: 3, type: "Harassment", description: "Complaint received", status: "Under Review", priority: "Critical" },
    { id: 4, type: "Maintenance", description: "Water leak in basement", status: "Resolved", priority: "Medium" },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-foreground/60">Manage resources, announcements, and campus operations</p>
          </div>
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <Card key={idx} className="bg-card/50 border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-foreground/60 text-sm mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <p className="text-xs text-accent font-semibold">{stat.change}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-card/50 border border-border/60">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="bg-card/50 border-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Active Users</span>
                    <span className="font-semibold">1,287</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Resource Utilization</span>
                    <span className="font-semibold">78%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Open Issues</span>
                    <span className="font-semibold">12</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 bg-card/50 border-border/60">
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Server Status</span>
                      <span className="text-green-400">Online</span>
                    </div>
                    <div className="w-full bg-secondary/50 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full w-full"></div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Database Performance</span>
                      <span className="text-green-400">Good</span>
                    </div>
                    <div className="w-full bg-secondary/50 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full w-4/5"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-4">
            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle>Create Announcement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Title" className="bg-card/50 border-border/60" />
                <textarea
                  placeholder="Content..."
                  className="w-full p-3 rounded-md bg-card/50 border border-border/60 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
                  rows={4}
                />
                <div className="flex gap-2">
                  <Input placeholder="Select Category" className="bg-card/50 border-border/60" />
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">Publish</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-3 rounded bg-secondary/30">
                    <span>Total Active Users: 2,543</span>
                    <span className="text-accent">View All</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded bg-secondary/30">
                    <span>Students: 2,100</span>
                    <span className="text-accent">Manage</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded bg-secondary/30">
                    <span>Faculty: 287</span>
                    <span className="text-accent">Manage</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded bg-secondary/30">
                    <span>Admins: 156</span>
                    <span className="text-accent">Manage</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle>Incident Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-border/40"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-sm mb-1">{report.description}</p>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {report.type}
                        </Badge>
                        <Badge
                          className={`text-xs ${
                            report.priority === "Critical"
                              ? "bg-red-500/30 text-red-400"
                              : report.priority === "High"
                                ? "bg-orange-500/30 text-orange-400"
                                : "bg-yellow-500/30 text-yellow-400"
                          }`}
                        >
                          {report.priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          report.status === "Resolved"
                            ? "bg-green-500/20 text-green-400"
                            : report.status === "In Progress"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {report.status}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
