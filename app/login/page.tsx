"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2, GraduationCap, Shield, AlertCircle, RefreshCw } from "lucide-react"
import { checkAuthenticationStatus, saveAuthData } from "@/lib/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const redirectedRef = useRef(false) // Prevent multiple redirects
  const authCheckCompleteRef = useRef(false) // Track if initial auth check is done
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true) // Show loading while checking auth

  const [loginData, setLoginData] = useState({
    registrationNo: "",
    password: "",
  })
  const [captchaSessionId, setCaptchaSessionId] = useState<string | null>(null)
  const [captchaImageUrl, setCaptchaImageUrl] = useState<string | null>(null)
  const [captchaSolution, setCaptchaSolution] = useState("")
  const [showCaptchaModal, setShowCaptchaModal] = useState(false)
  const [isRefreshingCaptcha, setIsRefreshingCaptcha] = useState(false)

  // ============ CRITICAL: Initial Auth Check ============
  useEffect(() => {
    const performAuthCheck = async () => {
      // Only run once
      if (authCheckCompleteRef.current) return
      authCheckCompleteRef.current = true

      try {
        const { isAuthenticated, studentData } = await checkAuthenticationStatus()
        
        // If already authenticated, redirect to dashboard (but only once)
        if (isAuthenticated && studentData && !redirectedRef.current) {
          redirectedRef.current = true
          console.log('[Login] User already authenticated, redirecting to dashboard')
          
          // Add small delay to ensure state is synchronized
          await new Promise(resolve => setTimeout(resolve, 100))
          router.push("/dashboard")
          return
        }
      } catch (err) {
        console.error('[Login] Auth check error:', err)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    performAuthCheck()
  }, [router])

  // Validate registration number format
  const validateRegNo = useCallback((regNo: string): boolean => {
    // VIT registration number format: YYBCE1234 (2 digits, 3 letters, 4 digits)
    const regNoRegex = /^\d{2}[A-Z]{3}\d{4}$/
    return regNoRegex.test(regNo.toUpperCase())
  }, [])

  // Refresh CAPTCHA by calling the API
  const refreshCaptcha = useCallback(async () => {
    if (!captchaSessionId) {
      setError("No active session. Please try logging in again.")
      return
    }
    
    setIsRefreshingCaptcha(true)
    setError("")
    
    try {
      console.log('[CAPTCHA Refresh] Requesting new CAPTCHA for session:', captchaSessionId)
      
      const response = await fetch(`/api/vit-captcha?sessionId=${captchaSessionId}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json'
        },
      })

      const data = await response.json()

      if (response.ok && data.success && data.captchaImageUrl) {
        setCaptchaImageUrl(data.captchaImageUrl)
        setCaptchaSolution("") // Clear the input
        console.log('[CAPTCHA Refresh] New CAPTCHA loaded successfully')
      } else {
        throw new Error(data.error || 'Failed to refresh CAPTCHA')
      }
    } catch (error) {
      console.error("[CAPTCHA Refresh] Failed:", error)
      setError("Failed to refresh CAPTCHA. Please try logging in again.")
    } finally {
      setIsRefreshingCaptcha(false)
    }
  }, [captchaSessionId])

  const handleCaptchaSolve = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent multiple submissions
    if (isLoading || isSubmitting) {
      console.warn('[CAPTCHA] Submission already in progress, ignoring duplicate submit')
      return
    }
    
    if (!captchaSessionId) {
      setError("CAPTCHA session expired. Please try login again.")
      setShowCaptchaModal(false)
      return
    }
    
    if (!captchaSolution.trim()) {
      setError("Please enter the CAPTCHA text")
      return
    }

    setError("")
    setIsLoading(true)
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/vit-captcha", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId: captchaSessionId,
          captchaSolution: captchaSolution.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if error response includes a new CAPTCHA
        if (data.code === 'INVALID_CAPTCHA' && data.captcha?.captchaImageUrl) {
          setError("Incorrect CAPTCHA. VIT has generated a new one, please try again.")
          setCaptchaSolution("")
          setCaptchaImageUrl(data.captcha.captchaImageUrl)
          console.log('[CAPTCHA] New CAPTCHA image loaded from error response')
          return
        }
        
        throw new Error(data.error || data.message || "CAPTCHA verification failed")
      }

      if (!data.success) {
        if (data.code === 'INVALID_CAPTCHA') {
          // Check if new CAPTCHA is in the response
          if (data.captcha?.captchaImageUrl) {
            setError("Incorrect CAPTCHA. VIT has generated a new one, please try again.")
            setCaptchaSolution("")
            setCaptchaImageUrl(data.captcha.captchaImageUrl)
            console.log('[CAPTCHA] New CAPTCHA image loaded')
          } else {
            setError("Incorrect CAPTCHA. Please try again.")
            setCaptchaSolution("")
          }
          return
        }
        throw new Error(data.error || "Login failed")
      }

      setSuccess("Login successful! Redirecting...")

      // Store minimal data in sessionStorage
      if (data.data?.sessionToken) {
        sessionStorage.setItem('vitSessionToken', data.data.sessionToken)
      }
      
      const authData = {
        name: data.data?.name,
        registrationNo: data.data?.registrationNo,
        email: data.data?.email,
        branch: data.data?.branch,
        semester: data.data?.semester,
        sessionToken: data.data?.sessionToken,
        dataSessionId: data.data?.dataSessionId,
        lastLogin: new Date().toISOString()
      }
      
      saveAuthData(authData)

      // Close modal and reset state
      setCaptchaSessionId(null)
      setCaptchaImageUrl(null)
      setCaptchaSolution("")
      setShowCaptchaModal(false)

      // Ensure state update completes before redirect
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Set redirect flag and redirect (only once)
      if (!redirectedRef.current) {
        redirectedRef.current = true
        router.push("/dashboard")
      }
      
    } catch (err: any) {
      console.error("CAPTCHA solve error:", err)
      setError(err.message || "CAPTCHA verification failed. Please try again.")
      
      // If session expired, close modal
      if (err.message.includes('expired') || err.message.includes('session')) {
        setShowCaptchaModal(false)
        setCaptchaSessionId(null)
      }
    } finally {
      setIsLoading(false)
      setIsSubmitting(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent multiple submissions - double check
    if (isSubmitting || isLoading) {
      console.warn('[Login] Submission already in progress, ignoring duplicate submit')
      return
    }
    
    setIsSubmitting(true)
    setIsLoading(true)
    setError("")
    setSuccess("")

    // Validate inputs
    if (!loginData.registrationNo || !loginData.password) {
      setError("Registration number and password are required")
      setIsLoading(false)
      setIsSubmitting(false)
      return
    }

    // Validate registration number format
    if (!validateRegNo(loginData.registrationNo)) {
      setError("Invalid registration number format. Use format: 24BCE1234")
      setIsLoading(false)
      setIsSubmitting(false)
      return
    }

    // Normalize registration number
    const normalizedRegNo = loginData.registrationNo.toUpperCase()

    try {
      console.log("Authenticating with VIT portal...")
      
      const response = await fetch("/api/vit-auth", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          registrationNo: normalizedRegNo,
          password: loginData.password,
        }),
      })

      const data = await response.json()
      console.log("VIT authentication response:", data)

      if (!response.ok) {
        // Handle specific error codes
        if (data.code === 'INVALID_CREDENTIALS') {
          throw new Error("Invalid VIT credentials. Please check your registration number and password.")
        } else if (data.code === 'RATE_LIMITED') {
          throw new Error("Too many attempts. Please try again in a minute.")
        } else if (data.code === 'VTOP_ERROR') {
          throw new Error("VTOP portal is currently unavailable. Please try again later.")
        }
        throw new Error(data.error || data.message || "VIT authentication failed")
      }

      // Check if CAPTCHA is required - can be in data or data.data
      const captchaData = data.captcha || data.data?.captcha
      if (captchaData?.requiresCaptcha) {
        console.log("CAPTCHA required, showing modal...")
        setCaptchaSessionId(captchaData.sessionId)
        setCaptchaImageUrl(captchaData.captchaImageUrl)
        setShowCaptchaModal(true)
        setSuccess("Please solve the CAPTCHA to continue")
        setIsLoading(false)
        setIsSubmitting(false) // Reset submitting state
        return
      }

      // If login successful without CAPTCHA
      if (data.success && data.data) {
        setSuccess("VIT credentials verified! Redirecting...")

        // Save auth data using centralized function
        const authData = {
          name: data.data.name,
          registrationNo: data.data.registrationNo,
          email: data.data.email,
          branch: data.data.branch,
          semester: data.data.semester,
          sessionToken: data.data.sessionToken,
          dataSessionId: data.data.dataSessionId,
          lastLogin: new Date().toISOString()
        }
        
        saveAuthData(authData)

        // Clear password from state
        setLoginData(prev => ({ ...prev, password: "" }))

        // Ensure state update completes before redirect
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Set redirect flag and redirect (only once)
        if (!redirectedRef.current) {
          redirectedRef.current = true
          router.push("/dashboard")
        }
        return
      }

      // If no success flag but has data (backward compatibility)
      if (data.data) {
        setSuccess("Login successful! Redirecting...")
        
        const authData = {
          ...data.data,
          lastLogin: new Date().toISOString()
        }
        
        saveAuthData(authData)

        // Ensure state update completes before redirect
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Set redirect flag and redirect (only once)
        if (!redirectedRef.current) {
          redirectedRef.current = true
          router.push("/dashboard")
        }
        return
      }

      throw new Error("Unexpected response from server")

    } catch (err: any) {
      console.error("Login error:", err)
      const errorMsg = err.message || "Authentication failed. Please try again."
      setError(errorMsg)
      
    } finally {
      setIsLoading(false)
      setIsSubmitting(false)
    }
  }

  // Handle Enter key in CAPTCHA modal
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showCaptchaModal && e.key === 'Enter' && !isLoading) {
        const form = document.querySelector('form')
        form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
      }
    }

    if (showCaptchaModal) {
      window.addEventListener('keypress', handleKeyPress)
    }

    return () => {
      window.removeEventListener('keypress', handleKeyPress)
    }
  }, [showCaptchaModal, isLoading])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                VIT Chennai Hub
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Secure Student Portal</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>End-to-end encrypted connection</span>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-border/60 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Student Login</CardTitle>
            <CardDescription>
              Sign in with your official VIT credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="reg-no" className="text-sm font-medium">
                  Registration Number
                </Label>
                <Input
                  id="reg-no"
                  type="text"
                  placeholder="24BCE1234"
                  value={loginData.registrationNo}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase()
                    setLoginData({ ...loginData, registrationNo: value })
                    if (error) setError("")
                  }}
                  required
                  disabled={isLoading}
                  autoComplete="username"
                  className="h-11"
                  pattern="\d{2}[A-Z]{3}\d{4}"
                  title="Format: YYBCE1234 (2 digits, 3 letters, 4 digits)"
                />
                <p className="text-xs text-muted-foreground">
                  Format: 24BCE1234 (Year + Branch + Number)
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    VIT Password
                  </Label>
                  <Link 
                    href="https://vtopcc.vit.ac.in/vtop/forgotPassword" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your VTOP password"
                    value={loginData.password}
                    onChange={(e) => {
                      setLoginData({ ...loginData, password: e.target.value })
                      if (error) setError("")
                    }}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="animate-in fade-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="ml-2">{error}</AlertDescription>
                </Alert>
              )}

              {success && !showCaptchaModal && (
                <Alert className="border-green-500/50 bg-green-500/10 animate-in fade-in">
                  <AlertDescription className="text-green-600">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 font-medium" 
                disabled={isLoading || isSubmitting}
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {showCaptchaModal ? "Verifying..." : "Authenticating..."}
                  </span>
                ) : (
                  "Sign In to VTOP"
                )}
              </Button>

              <div className="pt-2">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/40" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground">Security Notice</span>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-4 px-2">
                  🔒 Your credentials are never stored. We use secure session tokens for authentication.
                  All communication is encrypted end-to-end.
                </p>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-2 border-t border-border/40">
            <p className="text-xs text-center text-muted-foreground">
              ℹ️ Use your official VTOP (vtopcc.vit.ac.in) credentials
            </p>
            <p className="text-xs text-center text-muted-foreground">
              Having issues? Contact{' '}
              <a 
                href="mailto:help@vtop.vit.ac.in" 
                className="text-primary hover:underline"
              >
                VTOP Helpdesk
              </a>
            </p>
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            © 2026 VIT Chennai. Unofficial student portal.
          </p>
          <p className="text-xs text-muted-foreground">
            Not affiliated with VIT administration.
          </p>
        </div>
      </div>

      {/* CAPTCHA Modal */}
      {showCaptchaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md border border-border/60 animate-in slide-in-from-bottom-4">
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-accent" />
                  CAPTCHA Verification Required
                </h3>
                <p className="text-sm text-muted-foreground">
                  VTOP requires CAPTCHA verification to ensure security.
                  Enter the text exactly as shown in the image below.
                </p>
              </div>

              {/* CAPTCHA Image Container */}
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 bg-gradient-to-b from-secondary/30 to-transparent flex flex-col items-center justify-center min-h-[180px]">
                {captchaImageUrl ? (
                  <>
                    <img
                      src={captchaImageUrl}
                      alt="CAPTCHA from VTOP"
                      className="w-full max-w-md h-auto object-contain"
                      style={{ minHeight: '60px' }}
                      onError={() => {
                        setError("Failed to load CAPTCHA image. Please try again.")
                        setCaptchaImageUrl(null)
                      }}
                    />
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={refreshCaptcha}
                        disabled={isRefreshingCaptcha}
                        className="h-8 text-xs"
                      >
                        {isRefreshingCaptcha ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        New CAPTCHA
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Can't read? Try a new one
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Loading CAPTCHA from VTOP...
                    </p>
                  </div>
                )}
              </div>

              <form onSubmit={handleCaptchaSolve} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="captcha-solution" className="text-sm font-medium">
                    Enter CAPTCHA Text (case-sensitive)
                  </Label>
                  <Input
                    id="captcha-solution"
                    type="text"
                    placeholder="Type the characters exactly as shown"
                    value={captchaSolution}
                    onChange={(e) => {
                      setCaptchaSolution(e.target.value)
                      if (error) setError("")
                    }}
                    disabled={isLoading}
                    autoComplete="off"
                    className="h-11 font-mono text-lg tracking-wider text-center"
                    autoFocus
                  />
                </div>

                {error && (
                  <Alert variant="destructive" className="animate-in fade-in">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="ml-2">{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <AlertDescription className="text-green-600">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowCaptchaModal(false)
                      setCaptchaSessionId(null)
                      setCaptchaImageUrl(null)
                      setCaptchaSolution("")
                      setError("")
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={isLoading || isSubmitting || !captchaSolution.trim()}
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying...
                      </span>
                    ) : (
                      "Submit & Login"
                    )}
                  </Button>
                </div>
              </form>

              <div className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                <p className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  This CAPTCHA is loaded directly from VTOP servers. Your input is securely forwarded.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}