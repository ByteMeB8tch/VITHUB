"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authService, type UserProfile } from "@/lib/auth"
import type { Models } from "appwrite"

interface AuthContextType {
  user: Models.User<Models.Preferences> | null
  userProfile: UserProfile | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        const profile = await authService.getUserProfile(currentUser.$id)
        setUserProfile(profile)
      }
    } catch (error) {
      console.error("Auth check failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    await authService.login(email, password)
    await checkAuth()
    router.push("/dashboard")
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
    setUserProfile(null)
    router.push("/login")
  }

  const signup = async (email: string, password: string, name: string) => {
    await authService.createAccount(email, password, name)
    await checkAuth()
    router.push("/dashboard")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isLoading,
        login,
        logout,
        signup,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
