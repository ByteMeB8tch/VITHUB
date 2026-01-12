import { NextRequest, NextResponse } from 'next/server'
import { solveCaptchaWithOCR } from '@/lib/vitAuth'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, captchaImageUrl } = await request.json()

    if (!sessionId || !captchaImageUrl) {
      return NextResponse.json(
        { error: 'Missing sessionId or captchaImageUrl' },
        { status: 400 }
      )
    }

    console.log(`[API] Solving CAPTCHA with OCR for session: ${sessionId}`)

    const result = await solveCaptchaWithOCR(sessionId, captchaImageUrl)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to solve CAPTCHA with OCR' },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] CAPTCHA OCR error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
