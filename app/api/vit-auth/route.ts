import { NextRequest, NextResponse } from "next/server"
import { authenticateVITPortal, getMockVITData } from "@/lib/vitAuth"

export async function POST(request: NextRequest) {
  try {
    const { registrationNo, password } = await request.json()

    // Validate input
    if (!registrationNo || !password) {
      return NextResponse.json({ error: "Registration number and password are required" }, { status: 400 })
    }

    console.log(`[API] Authenticating VIT user: ${registrationNo}`)

    // Try to authenticate with VIT portal
    let vitData = await authenticateVITPortal(registrationNo, password)

    // Fallback to mock data for testing (remove in production)
    if (!vitData) {
      console.log("[API] Using mock data for testing")
      vitData = getMockVITData(registrationNo)
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
