// app/api/vit-captcha/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { solveCaptchaAndLogin, refreshCaptchaImage } from '@/lib/vitAuth'

// GET endpoint to refresh CAPTCHA image
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Session ID is required', 
          code: 'INVALID_INPUT' 
        },
        { status: 400 }
      )
    }

    console.log(`[API VIT-CAPTCHA GET] Refreshing CAPTCHA for session: ${sessionId}`)

    const result = await refreshCaptchaImage(sessionId)

    if (result.success && result.captchaImageUrl) {
      return NextResponse.json({
        success: true,
        captchaImageUrl: result.captchaImageUrl,
        sessionId: sessionId,
        timestamp: Date.now()
      })
    }

    return NextResponse.json(
      { 
        success: false, 
        error: result.error || 'Failed to refresh CAPTCHA', 
        code: result.code || 'REFRESH_FAILED' 
      },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('[API VIT-CAPTCHA GET] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to refresh CAPTCHA', 
        code: 'SERVER_ERROR',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, captchaSolution } = await request.json()

    // Validate input
    if (!sessionId || !captchaSolution) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Session ID and CAPTCHA solution are required', 
          code: 'INVALID_INPUT' 
        },
        { status: 400 }
      )
    }

    // Trim the captcha solution but preserve case
    const trimmedSolution = captchaSolution.trim()

    if (!trimmedSolution) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'CAPTCHA solution cannot be empty', 
          code: 'INVALID_INPUT' 
        },
        { status: 400 }
      )
    }

    console.log(`[API VIT-CAPTCHA] Processing CAPTCHA for session: ${sessionId}`)
    console.log(`[API VIT-CAPTCHA] Solution length: ${trimmedSolution.length}`)

    // Call the Puppeteer-based CAPTCHA solver
    // This returns AuthResult: { success, data?, error?, code? }
    const result = await solveCaptchaAndLogin(sessionId, trimmedSolution)

    console.log(`[API VIT-CAPTCHA] Result:`, {
      success: result.success,
      hasData: !!result.data,
      error: result.error,
      code: result.code
    })

    // Case 1: CAPTCHA solved and login successful
    if (result.success && result.data) {
      console.log(`[API VIT-CAPTCHA] Success for: ${result.data.registrationNo}`)
      return NextResponse.json({
        success: true,
        data: {
          name: result.data.name,
          registrationNo: result.data.registrationNo,
          email: result.data.email,
          branch: result.data.branch,
          semester: result.data.semester,
          sessionToken: result.data.sessionToken,
          dataSessionId: `data_${result.data.sessionToken}`, // For backward compatibility
        },
      })
    }

    // Case 2: CAPTCHA was incorrect
    if (!result.success && result.code === 'INVALID_CAPTCHA') {
      console.log('[API VIT-CAPTCHA] Invalid CAPTCHA, returning new CAPTCHA image')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Incorrect CAPTCHA. Please try again.', 
          code: 'INVALID_CAPTCHA',
          captcha: result.captcha // Include new CAPTCHA image
        },
        { status: 400 }
      )
    }

    // Case 3: Session expired
    if (!result.success && (result.code === 'SESSION_EXPIRED' || result.code === 'CONTEXT_EXPIRED')) {
      console.log('[API VIT-CAPTCHA] Session expired')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Session expired. Please try login again.', 
          code: 'SESSION_EXPIRED' 
        },
        { status: 400 }
      )
    }

    // Case 4: Other error
    console.error('[API VIT-CAPTCHA] Failed:', result.error)
    return NextResponse.json(
      { 
        success: false, 
        error: result.error || 'CAPTCHA verification failed', 
        code: result.code || 'CAPTCHA_ERROR' 
      },
      { status: 401 }
    )

  } catch (error: any) {
    console.error('[API VIT-CAPTCHA] Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'CAPTCHA verification service error', 
        code: 'SERVER_ERROR',
        details: error.message 
      },
      { status: 500 }
    )
  }
}