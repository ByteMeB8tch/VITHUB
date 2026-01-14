"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function VITSignupPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page
    router.replace("/login")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to login...</p>
    </div>
  )
}
