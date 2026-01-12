import { NextRequest, NextResponse } from "next/server"
import { authenticateVITPortal } from "@/lib/vitAuth"

export async function POST(request: NextRequest) {
  try {
    const { registrationNo, password } = await request.json()

    // Validate input
    if (!registrationNo || !password) {
      return NextResponse.json({ error: "Registration number and password are required" }, { status: 400 })
    }

    console.log(`[API] Authenticating VIT user: ${registrationNo}`)

    // Try to authenticate with VIT portal
    const vitData = await authenticateVITPortal(registrationNo, password)

    if (!vitData) {
      console.error("[API] Failed to authenticate with VIT portal - no data returned")
      return NextResponse.json(
        {
          error: "Failed to authenticate with VIT portal. Invalid credentials or portal is unavailable.",
          details: "Could not extract student data from VTOPCC",
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: vitData,
    })
  } catch (error) {
    console.error("[API] Error in VIT authentication:", error)
    return NextResponse.json(
      {
        error: "Failed to authenticate with VIT portal. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
