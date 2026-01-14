"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, FileText, Bell, AlertCircle, BookOpen, Wrench, Loader2, RefreshCw, LogOut } from "lucide-react"
import { toast } from "sonner"
import { checkAuthenticationStatus, getStoredAuthData, clearAuthStorage } from "@/lib/auth-context"

export default function Dashboard() {
  const router = useRouter()
  const redirectedRef = useRef(false) // Prevent multiple redirects
  const authCheckCompleteRef = useRef(false) // Track if auth check is done
  
  const [studentData, setStudentData] = useState<any>(null)
  const [realTimeData, setRealTimeData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // ============ CRITICAL: Initial Auth Check ============
  useEffect(() => {
    const performAuthCheck = async () => {
      // Only run once
      if (authCheckCompleteRef.current) return
      authCheckCompleteRef.current = true

      try {
        const { isAuthenticated, studentData: authData } = await checkAuthenticationStatus()
        
        // If NOT authenticated, redirect to login (but only once)
        if (!isAuthenticated) {
          if (!redirectedRef.current) {
            redirectedRef.current = true
            console.log('[Dashboard] Not authenticated, redirecting to login')
            
            clearAuthStorage()
            
            // Add small delay to ensure cleanup is complete
            await new Promise(resolve => setTimeout(resolve, 100))
            router.push("/login")
          }
          return
        }

        // If authenticated, load student data
        if (authData) {
          setStudentData(authData)
          console.log('[Dashboard] User authenticated:', authData.registrationNo)
          
          // Fetch real VTOP data
          await fetchVtopData()
        }
      } catch (error) {
        console.error("[Dashboard] Auth check failed:", error)
        
        if (!redirectedRef.current) {
          redirectedRef.current = true
          clearAuthStorage()
          toast.error("Session expired. Please login again.")
          
          await new Promise(resolve => setTimeout(resolve, 100))
          router.push("/login")
        }
      } finally {
        setIsLoading(false)
      }
    }

    performAuthCheck()
  }, [router])

  const fetchVtopData = async () => {
    try {
      setIsRefreshing(true)
      const response = await fetch('/api/vtop/dashboard', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch VTOP data')
      }

      const data = await response.json()
      setRealTimeData(data)
    } catch (error) {
      console.error("Failed to fetch VTOP data:", error)
      toast.error("Could not fetch latest data")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleLogout = async () => {
    try {
      clearAuthStorage()
      
      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      toast.success("Logged out successfully")
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
      toast.error("Logout failed")
    }
  }

  const handleRefresh = async () => {
    await fetchVtopData()
    toast.success("Data refreshed")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground/60">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!studentData) {
    return null // Will redirect
  }

  // Use real data if available, otherwise show placeholders
  const userName = studentData.name || "User"
  const userRegNo = studentData.registrationNo || studentData.regNo || ""
  const userEmail = studentData.email || ""
  const userBranch = studentData.branch || ""
  const userSemester = studentData.semester || ""
  const userCGPA = studentData.cgpa || null
  const userCredits = studentData.credits || null
  const userAttendance = studentData.attendance || null
  const userCourses = studentData.courses || []

  // Stats from real VTOP data
  const stats = [
    { 
      icon: AlertCircle, 
      label: "Overall Attendance", 
      value: userAttendance ? `${userAttendance}%` : "--", 
      color: userAttendance && userAttendance < 75 ? "text-red-400" : "text-green-400" 
    },
    { 
      icon: BookOpen, 
      label: "CGPA", 
      value: userCGPA ? userCGPA.toFixed(2) : "--", 
      color: "text-blue-400" 
    },
    { 
      icon: FileText, 
      label: "Total Credits", 
      value: userCredits ? userCredits.toString() : "--", 
      color: "text-purple-400" 
    },
    { 
      icon: Calendar, 
      label: "Courses Enrolled", 
      value: userCourses.length > 0 ? userCourses.length.toString() : "--", 
      color: "text-cyan-400" 
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">Welcome back, {userName}</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="flex items-center gap-4 text-foreground/60">
              <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <span>•</span>
              <p>Reg No: {userRegNo}</p>
              {userBranch && (
                <>
                  <span>•</span>
                  <p>{userBranch}</p>
                </>
              )}
              {userSemester && (
                <>
                  <span>•</span>
                  <p>Sem {userSemester}</p>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="ml-auto"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="bg-card/50 border-border/60 hover:border-border/80 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-foreground/60 text-sm mb-2">{stat.label}</p>
                      <p className="text-3xl font-bold">{stat.value}</p>
                    </div>
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Data Status Indicator */}
        {(userCourses.length > 0 || userCGPA || userAttendance) && (
          <div className="p-4 border border-green-500/30 bg-green-500/10 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-green-500" />
              <p className="text-green-500">
                ✅ VTOP data loaded successfully from your account
              </p>
            </div>
          </div>
        )}

        {/* Main Content - Courses */}
        {userCourses.length > 0 ? (
          <div className="space-y-6">
            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle>Enrolled Courses</CardTitle>
                <CardDescription>Your current semester courses from VTOP</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userCourses.map((course: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-lg bg-secondary/30 border border-border/40">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-lg">{course.courseName || 'Course'}</h3>
                            {course.courseCode && (
                              <Badge variant="secondary" className="font-mono">
                                {course.courseCode}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-foreground/60">
                            {course.faculty && (
                              <span>👨‍🏫 {course.faculty}</span>
                            )}
                            {course.slot && (
                              <span>🕐 Slot: {course.slot}</span>
                            )}
                            {course.courseType && (
                              <Badge variant="outline">{course.courseType}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {course.credits && (
                            <div className="mb-2">
                              <span className="text-2xl font-bold text-primary">{course.credits}</span>
                              <span className="text-sm text-foreground/60 ml-1">Credits</span>
                            </div>
                          )}
                          {course.attendance !== undefined && (
                            <div className={`text-sm font-semibold ${
                              course.attendance >= 75 ? 'text-green-500' : 
                              course.attendance >= 65 ? 'text-amber-500' : 
                              'text-red-500'
                            }`}>
                              📊 {course.attendance}% Attendance
                            </div>
                          )}
                          {course.grade && (
                            <Badge variant="default" className="mt-1">
                              Grade: {course.grade}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          !realTimeData && (
            <div className="p-4 border border-amber-500/30 bg-amber-500/10 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <p className="text-amber-500">
                  Course data will be displayed here after successful VTOP authentication
                </p>
              </div>
            </div>
          )
        )}

        {/* Fallback content for when no VTOP data is available */}
        {!userCourses.length && !realTimeData && (
          <div className="text-center py-12">
            <p className="text-foreground/60">Your course data will appear here once VTOP authentication is complete</p>
          </div>
        )}

        {/* Additional VTOP data sections if available */}
        {realTimeData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle>Today's Schedule</CardTitle>
                <CardDescription>Your classes for today</CardDescription>
              </CardHeader>
              <CardContent>
                {realTimeData.schedule?.length > 0 ? (
                  <div className="space-y-3">
                    {realTimeData.schedule.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-4 p-3 rounded-lg bg-secondary/30">
                        <div className="flex-shrink-0 w-16">
                          <p className="font-semibold text-accent">{item.time}</p>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{item.course}</p>
                          <p className="text-sm text-foreground/60">{item.room}</p>
                        </div>
                        <Badge variant="secondary">{item.type}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-foreground/60 text-center py-8">No classes scheduled for today</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">Recent Announcements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {realTimeData.announcements?.length > 0 ? (
                  realTimeData.announcements.map((ann: any, idx: number) => (
                    <div key={idx} className="border-b border-border/40 pb-3 last:border-0">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-sm">{ann.title}</p>
                        <Badge variant="secondary" className="text-xs">
                          {ann.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground/50">{ann.date}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-foreground/60 text-center py-8">No announcements</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}