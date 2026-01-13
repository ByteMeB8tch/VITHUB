// app/api/vit-auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authenticateVITPortal } from '@/lib/vitAuth'

export async function POST(request: NextRequest) {
  try {
    const { registrationNo, password } = await request.json()

    // Validate input
    if (!registrationNo || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Registration number and password are required', 
          code: 'INVALID_INPUT' 
        },
        { status: 400 }
      )
    }

    // Normalize registration number
    const normalizedRegNo = registrationNo.toUpperCase().trim()

    console.log(`[VIT-AUTH] Authenticating user: ${normalizedRegNo}`)

    // Call the Puppeteer-based authentication
    const result = await authenticateVITPortal(normalizedRegNo, password)

    // Handle the result based on the AuthResult structure
    if (!result.success) {
      // Check if CAPTCHA is required
      if (result.captcha?.requiresCaptcha) {
        console.log('[VIT-AUTH] CAPTCHA required, returning captcha data')
        return NextResponse.json({
          success: false,
          captcha: {
            requiresCaptcha: true,
            sessionId: result.captcha.sessionId,
            captchaImageUrl: result.captcha.captchaImageUrl,
          },
        })
      }

      // Return error
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Authentication failed', 
          code: result.code || 'AUTH_ERROR' 
        },
        { status: result.code === 'INVALID_CREDENTIALS' ? 401 : 500 }
      )
    }

    // Authentication successful without CAPTCHA
    if (result.data) {
      console.log(`[VIT-AUTH] Login successful for: ${normalizedRegNo}`)
      return NextResponse.json({
        success: true,
        data: {
          name: result.data.name,
          registrationNo: result.data.registrationNo,
          email: result.data.email,
          branch: result.data.branch,
          semester: result.data.semester,
          sessionToken: result.data.sessionToken,
        },
      })
    }

    // Unexpected case
    return NextResponse.json(
      { 
        success: false, 
        error: 'Unexpected authentication response', 
        code: 'UNEXPECTED_RESPONSE' 
      },
      { status: 500 }
    )

  } catch (error: any) {
    console.error('[VIT-AUTH] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Authentication service error', 
        code: 'SERVER_ERROR',
        details: error.message 
      },
      { status: 500 }
    )
  }
}