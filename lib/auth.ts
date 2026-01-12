import { account, databases } from "./appwrite"
import { ID } from "appwrite"

export interface UserProfile {
  $id: string
  email: string
  name: string
  role: "student" | "professor" | "admin"
  registrationNo?: string
  branch?: string
  semester?: string
  section?: string
}

export interface VITAuthPayload {
  registrationNo: string
  password: string
}

export const authService = {
  // Create account with VIT data
  async createAccountWithVIT(vitRegistrationNo: string, vitPassword: string, accountPassword: string, name: string) {
    try {
      // First authenticate with VIT and get student data
      const vitResponse = await fetch("/api/vit-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationNo: vitRegistrationNo,
          password: vitPassword,
        }),
      })

      if (!vitResponse.ok) {
        throw new Error("Failed to authenticate with VIT portal")
      }

      const { data: vitData } = await vitResponse.json()

      if (!vitData) {
        throw new Error("Could not retrieve student data from VIT portal")
      }

      // Create account with email from VIT data
      const email = vitData.email || `${vitRegistrationNo}@vitstudent.ac.in`
      const userAccount = await account.create(ID.unique(), email, accountPassword, name)

      // Log in the user
      await this.login(email, accountPassword)

      // Create profile with VIT data
      await this.createUserProfile(userAccount.$id, email, name, "student", {
        registrationNo: vitData.registrationNo,
        branch: vitData.branch,
        semester: vitData.semester,
        section: vitData.section,
      })

      return userAccount
    } catch (error) {
      throw error
    }
  },
  // Create a new account
  async createAccount(email: string, password: string, name: string) {
    try {
      // First, logout any existing session
      try {
        await account.deleteSession("current")
      } catch (e) {
        // No session to delete, continue
      }

      const userAccount = await account.create(ID.unique(), email, password, name)
      
      // Log in the user automatically first
      await this.login(email, password)
      
      // Create user profile in database after login (when user is authenticated)
      await this.createUserProfile(userAccount.$id, email, name, "student")
      
      return userAccount
    } catch (error) {
      throw error
    }
  },

  // Login
  async login(email: string, password: string) {
    try {
      // Clear any existing session first
      try {
        await account.deleteSession("current")
      } catch (e) {
        // No session to delete, continue
      }
      
      return await account.createEmailPasswordSession(email, password)
    } catch (error) {
      throw error
    }
  },

  // Logout
  async logout() {
    try {
      await account.deleteSession("current")
    } catch (error) {
      throw error
    }
  },

  // Get current user
  async getCurrentUser() {
    try {
      return await account.get()
    } catch (error) {
      return null
    }
  },

  // Get current session
  async getCurrentSession() {
    try {
      return await account.getSession("current")
    } catch (error) {
      return null
    }
  },

  // Create user profile in database
  async createUserProfile(
    userId: string,
    email: string,
    name: string,
    role: "student" | "professor" | "admin" = "student",
    vitData?: {
      registrationNo?: string
      branch?: string
      semester?: string
      section?: string
    }
  ) {
    try {
      if (!process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || !process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID) {
        console.warn("Database or Collection ID not configured. Skipping profile creation.")
        return null
      }

      console.log("Creating profile with:", {
        databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        collectionId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
        userId,
        email,
        name,
        role,
        vitData,
      })

      const profile = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
        userId,
        {
          email,
          name,
          role,
          registrationNo: vitData?.registrationNo || "",
          branch: vitData?.branch || "",
          semester: vitData?.semester || "",
        }
      )

      console.log("Profile created successfully:", profile)
      return profile
    } catch (error: any) {
      console.error("Error creating user profile:", error)
      console.error("Error details:", error.message, error.code, error.type)
      return null
    }
  },

  // Get user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      if (!process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || !process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID) {
        return null
      }

      const profile = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
        userId
      )
      return profile as unknown as UserProfile
    } catch (error) {
      return null
    }
  },
}
