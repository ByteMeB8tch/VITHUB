"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GraduationCap, Loader2, ExternalLink, CheckCircle, AlertCircle } from "lucide-react"
import { checkAuthenticationStatus, saveAuthData } from "@/lib/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const [popupOpen, setPopupOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const popupRef = useRef<Window | null>(null)
  const popupCheckInterval = useRef<NodeJS.Timeout | null>(null)
  const autoVerifyInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const { isAuthenticated } = await checkAuthenticationStatus()
        if (isAuthenticated) {
          router.push("/dashboard")
        }
      } catch (e) {
        console.log("No existing session")
      }
    }
    checkAuth()
  }, [router])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close()
      }
      if (popupCheckInterval.current) {
        clearInterval(popupCheckInterval.current)
      }
      if (autoVerifyInterval.current) {
        clearInterval(autoVerifyInterval.current)
      }
    }
  }, [])

  const handleVTOPLogin = () => {
    setError("")
    setSuccess("")
    
    // Open VTOP in a popup window
    const width = 800
    const height = 700
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2
    
    const popup = window.open(
      "https://vtopcc.vit.ac.in",
      "VTOP Login",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
    )
    
    if (popup) {
      popupRef.current = popup
      setPopupOpen(true)
      
      // Start auto-checking for login after 10 seconds
      setTimeout(() => {
        if (popup && !popup.closed) {
          startAutoCheck()
        }
      }, 10000) // Wait 10 seconds before starting auto-check
      
      // Check if popup is closed
      popupCheckInterval.current = setInterval(() => {
        if (popup.closed) {
          clearInterval(popupCheckInterval.current!)
          popupCheckInterval.current = null
          
          if (autoVerifyInterval.current) {
            clearInterval(autoVerifyInterval.current)
            autoVerifyInterval.current = null
          }
          
          setPopupOpen(false)
          setAutoCheckEnabled(false)
          popupRef.current = null
        }
      }, 500)
    } else {
      setError("Please allow popups for this website to login with VTOP")
    }
  }

  const handleVerifyLogin = async () => {
    setIsVerifying(true)
    setError("")
    
    try {
      // Call API to verify VTOP session and fetch data
      const response = await fetch("/api/vit-auth/verify-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      
      const data = await response.json()
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to verify VTOP session. Please make sure you logged in successfully.")
      }
      
      // Close popup if still open
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close()
        setPopupOpen(false)
      }
      
      // Stop auto-check if running
      if (autoVerifyInterval.current) {
        clearInterval(autoVerifyInterval.current)
        autoVerifyInterval.current = null
      }
      
      // Save auth data
      saveAuthData({
        name: data.data.name,
        registrationNo: data.data.registrationNo,
        email: data.data.email,
        branch: data.data.branch,
        semester: data.data.semester,
        cgpa: data.data.cgpa,
        credits: data.data.credits,
        attendance: data.data.attendance,
        courses: data.data.courses,
        sessionToken: data.data.sessionToken,
        lastLogin: new Date().toISOString()
      })
      
      setSuccess("Login successful! Redirecting to dashboard...")
      
      setTimeout(() => {
        router.push("/dashboard")
      }, 1000)
      
    } catch (err: any) {
      console.error("Verification error:", err)
      setError(err.message || "Failed to verify login. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const startAutoCheck = () => {
    setAutoCheckEnabled(true)
    
    // Check every 5 seconds if user has logged in
    autoVerifyInterval.current = setInterval(async () => {
      try {
        const response = await fetch("/api/vit-auth/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
        
        const data = await response.json()
        
        if (response.ok && data.success) {
          // User is logged in! Close popup and redirect
          if (autoVerifyInterval.current) {
            clearInterval(autoVerifyInterval.current)
            autoVerifyInterval.current = null
          }
          
          if (popupRef.current && !popupRef.current.closed) {
            popupRef.current.close()
            setPopupOpen(false)
          }
          
          saveAuthData({
            name: data.data.name,
            registrationNo: data.data.registrationNo,
            email: data.data.email,
            branch: data.data.branch,
            semester: data.data.semester,
            cgpa: data.data.cgpa,
            credits: data.data.credits,
            attendance: data.data.attendance,
            courses: data.data.courses,
            sessionToken: data.data.sessionToken,
            lastLogin: new Date().toISOString()
          })
          
          setSuccess("Login detected! Redirecting to dashboard...")
          
          setTimeout(() => {
            router.push("/dashboard")
          }, 1000)
        }
      } catch (err) {
        // Silently fail - user might not be logged in yet
        console.log("Auto-check: Not logged in yet")
      }
    }, 5000) // Check every 5 seconds
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo and Header */}
        <div>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">CampusHub</h1>
          </div>
          <p className="text-muted-foreground text-lg">VIT Chennai Portal</p>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {!popupOpen ? (
            <>
              <p className="text-foreground/80 text-base">
                To access CampusHub, please login with your VIT credentials on VTOP.
              </p>

              <Button
                onClick={handleVTOPLogin}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-base font-semibold"
                disabled={isVerifying}
              >
                <GraduationCap className="mr-2 h-5 w-5" />
                Login with VTOP
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-xs text-muted-foreground">
                A popup window will open to the official VIT VTOP portal. Log in there, then return
                here to continue.
              </p>
            </>
          ) : (
            <>
              <div className="bg-secondary/30 border-2 border-primary/30 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <ExternalLink className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">VTOP Login Window Open</h3>
                  <p className="text-sm text-muted-foreground">
                    Please complete your login in the popup window.
                    {autoCheckEnabled && (
                      <>
                        <br />
                        <span className="text-primary font-medium">
                          ✓ Auto-detecting login... Window will close automatically.
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <Button
                  onClick={handleVerifyLogin}
                  className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold"
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verifying Login...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      I've Logged In - Continue
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => {
                    if (popupRef.current && !popupRef.current.closed) {
                      popupRef.current.close()
                    }
                    if (autoVerifyInterval.current) {
                      clearInterval(autoVerifyInterval.current)
                      autoVerifyInterval.current = null
                    }
                    setPopupOpen(false)
                    setAutoCheckEnabled(false)
                  }}
                  variant="ghost"
                  className="w-full"
                  disabled={isVerifying}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}

          {error && (
            <Alert variant="destructive" className="animate-in fade-in">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500/50 bg-green-500/10 animate-in fade-in">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="ml-2 text-green-600">{success}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            CampusHub uses your VIT credentials for authentication only.
            <br />
            Your password is never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  )
}