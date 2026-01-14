// components/VTOPDashboard.tsx - Display VTOP data with charts and metrics
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader, RefreshCw, AlertCircle, TrendingUp, BookOpen, Clock, Award } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface VTOPData {
  name: string
  email: string
  branch: string
  semester: string
  cgpa: number
  credits: number
  grades: Array<{
    courseCode: string
    courseName: string
    faculty: string
    grade: string
    credits: number
    points: number
  }>
  attendance: Array<{
    courseCode: string
    courseName: string
    present: number
    total: number
    percentage: number
  }>
  lastScraped?: string
}

interface VTOPDashboardProps {
  userId: string
  onDisconnect?: () => void
}

const GRADE_COLORS: Record<string, string> = {
  'A+': '#10b981',
  'A': '#34d399',
  'B+': '#60a5fa',
  'B': '#93c5fd',
  'C': '#fbbf24',
  'D': '#f97316',
  'F': '#ef4444',
  'W': '#9ca3af',
}

export function VTOPDashboard({ userId, onDisconnect }: VTOPDashboardProps) {
  const [data, setData] = useState<VTOPData | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string>('')
  const [lastRefresh, setLastRefresh] = useState<Date>()

  /**
   * Fetch VTOP data
   */
  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`/api/vtop-scrape?userId=${userId}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('No data available. Please connect your VTOP account first.')
          return
        }
        throw new Error('Failed to fetch data')
      }

      const result = await response.json()
      setData(result.data)
      setLastRefresh(new Date())
    } catch (error: any) {
      console.error('[VTOP-DASHBOARD] Error fetching data:', error)
      setError(error.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Refresh data by re-scraping VTOP
   */
  const refreshData = async () => {
    try {
      setIsRefreshing(true)
      const sessionResponse = await fetch(`/api/vtop-session?userId=${userId}`)

      if (!sessionResponse.ok) {
        setError('Your VTOP session has expired. Please reconnect.')
        return
      }

      const session = await sessionResponse.json()

      const scrapeResponse = await fetch('/api/vtop-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          registrationNo: data?.name, // This should be registration number
          sessionId: session.sessionId,
        }),
      })

      if (!scrapeResponse.ok) {
        throw new Error('Failed to refresh data')
      }

      await fetchData()
    } catch (error: any) {
      console.error('[VTOP-DASHBOARD] Error refreshing data:', error)
      setError(error.message || 'Failed to refresh data')
    } finally {
      setIsRefreshing(false)
    }
  }

  /**
   * Disconnect VTOP
   */
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your VTOP account?')) return

    try {
      const response = await fetch('/api/vtop-connection', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      setData(null)
      onDisconnect?.()
    } catch (error: any) {
      console.error('[VTOP-DASHBOARD] Error disconnecting:', error)
      setError(error.message || 'Failed to disconnect')
    }
  }

  // Fetch data on mount
  useEffect(() => {
    fetchData()
  }, [userId])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!data) return null

  // Calculate statistics
  const totalCourses = data.grades.length
  const avgGPA = totalCourses > 0 ? (data.grades.reduce((sum, g) => sum + g.points, 0) / totalCourses).toFixed(2) : '0'
  const avgAttendance =
    data.attendance.length > 0
      ? (data.attendance.reduce((sum, a) => sum + a.percentage, 0) / data.attendance.length).toFixed(1)
      : '0'

  // Prepare chart data
  const attendanceChartData = data.attendance.slice(0, 10).map(a => ({
    name: a.courseCode,
    percentage: parseFloat(a.percentage.toFixed(1)),
  }))

  const gradeDistribution = Object.entries(
    data.grades.reduce(
      (acc, g) => {
        acc[g.grade] = (acc[g.grade] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
  ).map(([grade, count]) => ({
    name: grade,
    value: count,
    color: GRADE_COLORS[grade] || '#6b7280',
  }))

  const coursePerformance = data.grades.slice(0, 8).map(g => ({
    code: g.courseCode,
    grade: g.grade,
    points: g.points,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{data.name}</h2>
          <p className="text-sm text-gray-600">{data.email}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle>Academic Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Branch</p>
              <p className="font-semibold">{data.branch}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Semester</p>
              <p className="font-semibold">{data.semester}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">CGPA</p>
              <p className="font-semibold text-green-600">{data.cgpa.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Credits</p>
              <p className="font-semibold">{data.credits}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{totalCourses}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Avg GPA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{avgGPA}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{avgAttendance}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-semibold">
                {lastRefresh ? lastRefresh.toLocaleDateString() : 'Just now'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="grades">Grade Distribution</TabsTrigger>
          <TabsTrigger value="courses">Course Performance</TabsTrigger>
        </TabsList>

        {/* Attendance Chart */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance by Course</CardTitle>
              <CardDescription>
                Attendance percentage for each course (showing first 10)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attendanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: any) => `${value}%`} />
                    <Bar dataKey="percentage" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-8">No attendance data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grade Distribution Chart */}
        <TabsContent value="grades">
          <Card>
            <CardHeader>
              <CardTitle>Grade Distribution</CardTitle>
              <CardDescription>Distribution of grades across courses</CardDescription>
            </CardHeader>
            <CardContent>
              {gradeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={gradeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {gradeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${value} courses`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-8">No grade data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Course Performance Table */}
        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Course Performance</CardTitle>
              <CardDescription>Your grades across all courses (showing first 8)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Course Code</th>
                      <th className="text-left py-2 px-2">Grade</th>
                      <th className="text-left py-2 px-2">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.grades.length > 0 ? (
                      data.grades.slice(0, 8).map((grade, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2">{grade.courseCode}</td>
                          <td className="py-2 px-2">
                            <span
                              className="px-2 py-1 rounded text-white text-xs font-semibold"
                              style={{
                                backgroundColor: GRADE_COLORS[grade.grade] || '#6b7280',
                              }}
                            >
                              {grade.grade}
                            </span>
                          </td>
                          <td className="py-2 px-2">{grade.points.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center py-4 text-gray-500">
                          No course data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
