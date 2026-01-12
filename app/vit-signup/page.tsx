"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authService } from "@/lib/auth"
import { Eye, EyeOff, Loader2, GraduationCap } from "lucide-react"

export default function VITSignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)
  const [step, setStep] = useState<"vit" | "account">("vit")

  const [vitData, setVitData] = useState({
    registrationNo: "",
    vitPassword: "",
  })

  const [accountData, setAccountData] = useState({
    name: "",
    accountPassword: "",
    confirmPassword: "",
  })

  const [retrievedData, setRetrievedData] = useState<any>(null)

  const handleVITVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      console.log("Verifying VIT credentials...")
      const response = await fetch("/api/vit-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vitData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to verify VIT credentials")
      }

      const { data } = await response.json()
      console.log("VIT data retrieved:", data)

      setRetrievedData(data)
      setAccountData({ ...accountData, name: data.name })
      setStep("account")
      setSuccess("VIT credentials verified! Now create your account password.")
    } catch (err: any) {
      setError(err.message || "Invalid VIT credentials. Please try again.")
      console.error("VIT verification error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (accountData.accountPassword !== accountData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (accountData.accountPassword.length < 8) {
      setError("Password must be at least 8 characters long")
      setIsLoading(false)
      return
    }

    try {
      console.log("Creating account with VIT data...")
      await authService.createAccountWithVIT(
        vitData.registrationNo,
        vitData.vitPassword,
        accountData.accountPassword,
        accountData.name
      )
      setSuccess("Account created successfully! Redirecting...")

      setTimeout(() => {
        router.push("/dashboard")
      }, 1000)
    } catch (err: any) {
      console.error("Account creation error:", err)
      setError(err.message || "Failed to create account. Please try again.")
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
          <p className="text-muted-foreground">Sign up with your VIT credentials</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              {step === "vit"
                ? "Verify your VIT credentials"
                : "Create your account password"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "vit" ? (
              <form onSubmit={handleVITVerification} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-no">Registration Number</Label>
                  <Input
                    id="reg-no"
                    placeholder="21BCE1234"
                    value={vitData.registrationNo}
                    onChange={(e) => setVitData({ ...vitData, registrationNo: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vit-password">VIT Portal Password</Label>
                  <div className="relative">
                    <Input
                      id="vit-password"
                      type={showPasswords ? "text" : "password"}
                      placeholder="Enter your VIT portal password"
                      value={vitData.vitPassword}
                      onChange={(e) => setVitData({ ...vitData, vitPassword: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  ℹ️ We only use your VIT credentials to verify your student status. Your password is not stored.
                </p>

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
                      Verifying...
                    </>
                  ) : (
                    "Verify VIT Credentials"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleAccountCreation} className="space-y-4">
                <div className="bg-secondary/50 p-3 rounded-lg space-y-2">
                  <p className="text-sm text-muted-foreground">Retrieved Information:</p>
                  <p className="font-semibold">{retrievedData?.name}</p>
                  <p className="text-sm text-muted-foreground">{retrievedData?.registrationNo}</p>
                  <p className="text-sm text-muted-foreground">{retrievedData?.branch} - Sem {retrievedData?.semester}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={accountData.name}
                    onChange={(e) => setAccountData({ ...accountData, name: e.target.value })}
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account-password">Create Password</Label>
                  <div className="relative">
                    <Input
                      id="account-password"
                      type={showPasswords ? "text" : "password"}
                      placeholder="Minimum 8 characters"
                      value={accountData.accountPassword}
                      onChange={(e) => setAccountData({ ...accountData, accountPassword: e.target.value })}
                      required
                      disabled={isLoading}
                      minLength={8}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPasswords ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={accountData.confirmPassword}
                    onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setStep("vit")
                      setError("")
                      setSuccess("")
                    }}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <p className="text-xs text-center text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Login
              </Link>
            </p>
            <p className="text-xs text-center text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
