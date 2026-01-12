"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authService } from "@/lib/auth"
import { Eye, EyeOff, Loader2, GraduationCap } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

export default function LoginPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [loginData, setLoginData] = useState({
    registrationNo: "",
    password: "",
  })
  const [captchaSessionId, setCaptchaSessionId] = useState<string | null>(null)
  const [captchaSolution, setCaptchaSolution] = useState("")

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard")
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user) {
    return null // Will redirect
  }

  const handleCaptchaSolve = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!captchaSessionId || !captchaSolution.trim()) {
      setError("Please enter the CAPTCHA solution")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      console.log("Submitting CAPTCHA solution...")

      const captchaResponse = await fetch("/api/vit-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: captchaSessionId,
          captchaSolution: captchaSolution,
        }),
      })

      if (!captchaResponse.ok) {
        const errorData = await captchaResponse.json()
        throw new Error(errorData.error || "CAPTCHA verification failed")
      }

      const { data: vitData } = await captchaResponse.json()
      console.log("CAPTCHA solved successfully:", vitData)
      setSuccess("CAPTCHA verified! Logging in...")

      // Now try to login with VIT data
      const email = vitData.email || `${loginData.registrationNo}@vitstudent.ac.in`

      try {
        await authService.login(email, loginData.password)
        console.log("Existing account found, logged in...")
      } catch (loginError: any) {
        console.log("Creating new account with VIT data...")
        await authService.createAccountWithVIT(
          loginData.registrationNo,
          loginData.password,
          loginData.password,
          vitData.name
        )
      }

      setSuccess("Login successful! Redirecting...")
      setCaptchaSessionId(null)
      setCaptchaSolution("")

      await new Promise(resolve => setTimeout(resolve, 500))
      window.location.href = "/dashboard"
    } catch (err: any) {
      console.error("CAPTCHA error:", err)
      setError(err.message || "CAPTCHA verification failed. Try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      console.log("Authenticating with VIT portal...")
      
      // First, authenticate with VIT portal
      const vitResponse = await fetch("/api/vit-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationNo: loginData.registrationNo,
          password: loginData.password,
        }),
      })

      if (!vitResponse.ok) {
        const errorData = await vitResponse.json()
        throw new Error(errorData.error || errorData.details || "VIT authentication failed")
      }

      const { data: vitData } = await vitResponse.json()
      console.log("VIT authentication response:", vitData)

      // Check if CAPTCHA is required
      if (vitData.requiresCaptcha) {
        console.log("CAPTCHA required")
        setCaptchaSessionId(vitData.sessionId)
        setSuccess("CAPTCHA required. Please solve it below.")
        setIsLoading(false)
        return
      }

      setSuccess("VIT credentials verified! Setting up your account...")

      // Try to login with VIT email
      const email = vitData.email || `${loginData.registrationNo}@vitstudent.ac.in`
      
      try {
        // Try to login if account already exists
        console.log("Attempting to login with existing account...")
        await authService.login(email, loginData.password)
        console.log("Existing account found, logged in successfully")
      } catch (loginError: any) {
        // Account doesn't exist, create it
        console.log("No existing account, creating new account with VIT data...")
        setSuccess("Creating your account...")
        await authService.createAccountWithVIT(
          loginData.registrationNo,
          loginData.password,
          loginData.password, // Use VIT password as account password
          vitData.name
        )
        console.log("Account created and logged in successfully")
      }

      setSuccess("Login successful! Redirecting...")
      
      // Wait a moment for the auth state to propagate
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Force a page reload to ensure auth state is updated
      window.location.href = "/dashboard"
    } catch (err: any) {
      console.error("Login error:", err)
      const errorMsg = err.message || "Invalid VIT credentials. Please check your registration number and password."
      setError(errorMsg)
      
      // Also log full error for debugging
      console.error("Full error:", {
        message: err.message,
        stack: err.stack,
        cause: err.cause
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">VIT Chennai Hub</h1>
          </div>
          <p className="text-muted-foreground">Vellore Institute of Technology, Chennai Campus</p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Student Login</CardTitle>
            <CardDescription>Sign in with your VIT credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-no">Registration Number</Label>
                <Input
                  id="reg-no"
                  type="text"
                  placeholder="21BCE1234"
                  value={loginData.registrationNo}
                  onChange={(e) => setLoginData({ ...loginData, registrationNo: e.target.value })}
                  required
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">VIT Portal Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your VIT password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <Link 
                  href="https://vtop.vit.ac.in/vtop/forgotPassword" 
                  target="_blank" 
                  className="text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-500 text-green-600">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {success ? "Setting up..." : "Authenticating..."}
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              {captchaSessionId && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-semibold mb-4">🔒 CAPTCHA Verification Required</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    The VIT portal requires CAPTCHA verification. Please enter the CAPTCHA solution below.
                  </p>
                  <form onSubmit={handleCaptchaSolve} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="captcha-solution">CAPTCHA Solution</Label>
                      <Input
                        id="captcha-solution"
                        type="text"
                        placeholder="Enter the CAPTCHA text"
                        value={captchaSolution}
                        onChange={(e) => setCaptchaSolution(e.target.value)}
                        disabled={isLoading}
                        autoComplete="off"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading || !captchaSolution.trim()}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify CAPTCHA"
                      )}
                    </Button>
                  </form>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">First time here?</span>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p>Simply login with your VIT credentials</p>
                <p className="text-xs">Your account will be created automatically on first login</p>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <p className="text-xs text-center text-muted-foreground">
              ℹ️ We use your VIT credentials only for authentication. Your password is never stored.
            </p>
            <p className="text-xs text-center text-muted-foreground">
              Need help? Contact support@vit.ac.in
            </p>
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>© 2026 VIT Chennai. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
