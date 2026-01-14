// app/dashboard/page-vtop-example.tsx - Example integration into your dashboard
// Copy relevant parts into your actual dashboard/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { VTOPPopupManager } from '@/components/VTOPPopupManager'
import { VTOPDashboard } from '@/components/VTOPDashboard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle } from 'lucide-react'

// Assuming you have auth context or hook
interface User {
  id: string
  name?: string
  email?: string
}

export default function DashboardPage() {
  // Get user from your auth context/hook
  // const { user } = useAuth() OR const user = useUser()
  
  // For this example, assume you have a user object
  const user: User = {
    id: 'user-123', // Replace with actual user ID from your auth
    name: 'John Doe',
    email: 'john@example.com'
  }

  const [vtopConnected, setVtopConnected] = useState(false)
  const [vtopPopupOpen, setVtopPopupOpen] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')

  // Check if user is already connected to VTOP on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`/api/vtop-connection?userId=${user.id}`)
        if (response.ok) {
          const data = await response.json()
          setVtopConnected(data.connected)
          setConnectionStatus(data.connected ? 'connected' : 'disconnected')
        }
      } catch (error) {
        console.error('Error checking VTOP connection:', error)
        setConnectionStatus('disconnected')
      }
    }

    if (user.id) {
      checkConnection()
    }
  }, [user.id])

  const handleVtopSuccess = (data: any) => {
    console.log('VTOP connected successfully:', data)
    setVtopConnected(true)
    setConnectionStatus('connected')
    setVtopPopupOpen(false)
  }

  const handleVtopError = (error: string) => {
    console.error('VTOP connection error:', error)
    setConnectionStatus('disconnected')
  }

  const handleVtopDisconnect = () => {
    setVtopConnected(false)
    setConnectionStatus('disconnected')
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user.name || user.email}</h1>
        <p className="text-gray-600 mt-2">Manage your academic dashboard</p>
      </div>

      {/* VTOP Connection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>VTOP Integration</CardTitle>
              <CardDescription>
                {vtopConnected
                  ? 'Your VTOP account is connected'
                  : 'Connect your VTOP account to view grades and attendance'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {connectionStatus === 'checking' && (
                <span className="text-sm text-gray-500">Checking...</span>
              )}
              {connectionStatus === 'connected' && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              )}
              {connectionStatus === 'disconnected' && (
                <div className="flex items-center gap-1 text-gray-500">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Disconnected</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!vtopConnected ? (
            <div className="space-y-3">
              <Alert>
                <AlertDescription>
                  Connect your VTOP account to automatically sync your grades, attendance, and academic information.
                  We never store your password - only your session securely.
                </AlertDescription>
              </Alert>
              <Button onClick={() => setVtopPopupOpen(true)} size="lg" className="w-full md:w-auto">
                Connect VTOP Account
              </Button>
            </div>
          ) : (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your VTOP account is connected and data is being synced.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Popup Manager - Opens when user clicks "Connect VTOP" */}
      <VTOPPopupManager
        userId={user.id}
        isOpen={vtopPopupOpen}
        onOpenChange={setVtopPopupOpen}
        onSuccess={handleVtopSuccess}
        onError={handleVtopError}
      />

      {/* VTOP Dashboard - Shows only if connected */}
      {vtopConnected && connectionStatus === 'connected' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Your Academic Data</h2>
          <VTOPDashboard userId={user.id} onDisconnect={handleVtopDisconnect} />
        </div>
      )}

      {/* Additional Dashboard Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Your other dashboard cards go here */}
        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Your announcements component */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Your events component */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Alternative: Minimal Integration
 * 
 * If you just want to add VTOP without changing everything:
 */

export function MinimalVTOPIntegration({ userId }: { userId: string }) {
  const [connected, setConnected] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>VTOP</CardTitle>
      </CardHeader>
      <CardContent>
        {!connected ? (
          <Button onClick={() => setPopupOpen(true)}>
            Connect VTOP
          </Button>
        ) : (
          <p className="text-green-600">✓ Connected</p>
        )}

        <VTOPPopupManager
          userId={userId}
          isOpen={popupOpen}
          onOpenChange={setPopupOpen}
          onSuccess={() => setConnected(true)}
        />
      </CardContent>
    </Card>
  )
}

/**
 * Usage in existing dashboard:
 * 
 * import { MinimalVTOPIntegration } from '@/app/dashboard/page-vtop-example'
 * 
 * export default function DashboardPage() {
 *   return (
 *     <div>
 *       <MinimalVTOPIntegration userId={user.id} />
 *       {/* Rest of your dashboard */}
 *     </div>
 *   )
 * }
 */
