import { NextRequest, NextResponse } from "next/server"
import { solveCaptchaAndLogin } from "@/lib/vitAuth"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, captchaSolution } = await request.json()

    // Validate input
    if (!sessionId || !captchaSolution) {
      return NextResponse.json(
        { error: "Session ID and CAPTCHA solution are required" },
        { status: 400 }
      )
    }

    console.log(`[API] Processing CAPTCHA for session: ${sessionId}`)
    console.log(`[API] CAPTCHA solution received (exact): "${captchaSolution}"`)
    console.log(`[API] Solution length: ${captchaSolution.length}`)

    if (!captchaSolution) {
      return NextResponse.json(
        { error: "CAPTCHA solution cannot be empty" },
        { status: 400 }
      )
    }

    console.log(`[API] Passing solution exactly as received: "${captchaSolution}"`)

    // Solve CAPTCHA and login - pass exact solution
    const vitData = await solveCaptchaAndLogin(sessionId, captchaSolution)

    if (!vitData) {
      return NextResponse.json(
        {
          error: "CAPTCHA verification failed. The solution may be incorrect.",
          details: "Please try again with the correct CAPTCHA text.",
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: vitData,
    })
  } catch (error) {
    console.error("[API] CAPTCHA error:", error)
    return NextResponse.json(
      {
        error: "Failed to verify CAPTCHA. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
