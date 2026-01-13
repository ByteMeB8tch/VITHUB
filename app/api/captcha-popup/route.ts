import { NextRequest, NextResponse } from "next/server"

// This endpoint is deprecated - now using inline CAPTCHA modal instead
export async function GET(request: NextRequest) {
  return new NextResponse("This endpoint is deprecated. Use inline CAPTCHA modal instead.", { 
    status: 410,
    headers: {
      'Content-Type': 'text/plain'
    }
  })
}
