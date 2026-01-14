// app/api/vtop-scrape/route.ts - Trigger VTOP data scraping with Appwrite
import { NextRequest, NextResponse } from 'next/server'
import { createDocument, updateDocument, getDocument, listDocuments } from '@/lib/appwriteDb'
import { decryptData, checkRateLimit } from '@/lib/security'
import { scrapeVTOPData } from '@/lib/vtopScraper'
import { COLLECTION_IDS, createDataDocument, createRefreshLogDocument } from '@/lib/vtopModels'

/**
 * POST /api/vtop-scrape
 * Scrape VTOP data using stored session cookies
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, registrationNo, sessionId } = await request.json()

    if (!userId || !registrationNo || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Rate limiting - More strict for scraping
    if (!checkRateLimit(userId, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: 'Scrape rate limit exceeded' },
        { status: 429 }
      )
    }

    console.log(`[VTOP-SCRAPE] Starting scrape for ${userId}/${registrationNo}`)

    const startTime = Date.now()

    // Get session with cookies
    try {
      const sessionDoc = await getDocument(COLLECTION_IDS.VTOP_SESSIONS, sessionId)

      if (!sessionDoc || sessionDoc.status !== 'active' || new Date(sessionDoc.expiresAt) < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Session not found or expired' },
          { status: 404 }
        )
      }

      // Decrypt cookies
      const decryptedCookiesStr = decryptData(sessionDoc.encryptedCookies)
      const cookies = JSON.parse(decryptedCookiesStr)

      // Scrape VTOP data
      const vtopData = await scrapeVTOPData(cookies, registrationNo)

      // Store scraped data
      const dataDoc = createDataDocument({
        userId,
        registrationNo,
        name: vtopData.name,
        email: vtopData.email,
        branch: vtopData.branch,
        semester: vtopData.semester,
        cgpa: vtopData.cgpa,
        credits: vtopData.credits,
        grades: JSON.stringify(vtopData.grades),
        attendance: JSON.stringify(vtopData.attendance),
      })

      // Check if data exists and update or create
      const existingData = await listDocuments(COLLECTION_IDS.VTOP_DATA, [
        `userId = "${userId}"`,
        `registrationNo = "${registrationNo}"`,
      ])

      if (existingData.documents.length > 0) {
        await updateDocument(COLLECTION_IDS.VTOP_DATA, existingData.documents[0].$id, dataDoc)
      } else {
        await createDocument(COLLECTION_IDS.VTOP_DATA, dataDoc)
      }

      // Log success
      const duration = Date.now() - startTime
      const logDoc = createRefreshLogDocument({
        userId,
        registrationNo,
        status: 'success',
        dataCountGrades: vtopData.grades.length,
        dataCountAttendance: vtopData.attendance.length,
        duration,
      })

      await createDocument(COLLECTION_IDS.VTOP_REFRESH_LOGS, logDoc)

      console.log(`[VTOP-SCRAPE] Success: ${registrationNo} (${duration}ms)`)

      return NextResponse.json({
        success: true,
        data: {
          name: vtopData.name,
          email: vtopData.email,
          branch: vtopData.branch,
          semester: vtopData.semester,
          cgpa: vtopData.cgpa,
          credits: vtopData.credits,
          gradesCount: vtopData.grades.length,
          attendanceCount: vtopData.attendance.length,
          scrapedAt: new Date().toISOString(),
        },
      })
    } catch (scrapeError: any) {
      // Log failure
      const duration = Date.now() - startTime
      const logDoc = createRefreshLogDocument({
        userId,
        registrationNo,
        status: 'failed',
        reason: scrapeError.message || 'Unknown error',
        duration,
        dataCountGrades: 0,
        dataCountAttendance: 0,
        errorMessage: scrapeError.message || 'Unknown error',
        errorCode: 'SCRAPE_ERROR',
        errorTimestamp: new Date().toISOString(),
      })

      await createDocument(COLLECTION_IDS.VTOP_REFRESH_LOGS, logDoc)

      console.error(`[VTOP-SCRAPE] Error: ${registrationNo}`, scrapeError)

      return NextResponse.json(
        { success: false, error: scrapeError.message || 'Failed to scrape VTOP data' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[VTOP-SCRAPE] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/vtop-scrape
 * Get latest scraped VTOP data
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    const registrationNo = request.nextUrl.searchParams.get('registrationNo')

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    const queries = [
      `userId = "${userId}"`,
      `expiresAt > "${new Date().toISOString()}"`, // Not expired
    ]

    if (registrationNo) {
      queries.push(`registrationNo = "${registrationNo}"`)
    }

    const dataList = await listDocuments(COLLECTION_IDS.VTOP_DATA, queries)

    if (dataList.documents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data available' },
        { status: 404 }
      )
    }

    const data = dataList.documents[0]

    return NextResponse.json({
      success: true,
      data: {
        name: data.name,
        email: data.email,
        branch: data.branch,
        semester: data.semester,
        cgpa: data.cgpa,
        credits: data.credits,
        grades: JSON.parse(data.grades || '[]'),
        attendance: JSON.parse(data.attendance || '[]'),
        lastScraped: data.lastScraped,
      },
    })
  } catch (error) {
    console.error('[VTOP-SCRAPE-GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve data' },
      { status: 500 }
    )
  }
}
