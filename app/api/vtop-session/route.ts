// app/api/vtop-session/route.ts - Manage VTOP session lifecycle with Appwrite
import { NextRequest, NextResponse } from 'next/server'
import { createDocument, updateDocument, getDocument, listDocuments, ID } from '@/lib/appwriteDb'
import { encryptData, decryptData, validateInput, checkRateLimit, generateToken } from '@/lib/security'
import { COLLECTION_IDS, VTOPSessionDocument, createSessionDocument } from '@/lib/vtopModels'

/**
 * POST /api/vtop-session
 * Create a new VTOP session after successful popup login
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, registrationNo, cookies, sessionData, userAgent, ipAddress } = await request.json()

    // Validate input
    if (!userId || !registrationNo || !cookies || !Array.isArray(cookies)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!validateInput(registrationNo, 'registrationNo')) {
      return NextResponse.json(
        { success: false, error: 'Invalid registration number format' },
        { status: 400 }
      )
    }

    // Rate limiting
    if (!checkRateLimit(userId, 50, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    console.log(`[VTOP-SESSION] Creating session for ${userId} (${registrationNo})`)

    // Encrypt cookies and session data
    const encryptedCookies = encryptData(JSON.stringify(cookies))
    const encryptedSessionData = encryptData(JSON.stringify(sessionData || {}))

    // Create session document using helper
    const sessionDoc = createSessionDocument({
      userId,
      registrationNo,
      encryptedCookies,
      encryptedSessionData,
      status: 'active',
      userAgent: userAgent || 'unknown',
      ipAddress,
    })

    // Create document in Appwrite
    const doc = await createDocument(COLLECTION_IDS.VTOP_SESSIONS, sessionDoc)

    // Update VTOPConnection
    try {
      const connections = await listDocuments(COLLECTION_IDS.VTOP_CONNECTIONS, [
        `userId = "${userId}"`
      ])

      if (connections.documents.length > 0) {
        const connDoc = connections.documents[0]
        await updateDocument(COLLECTION_IDS.VTOP_CONNECTIONS, connDoc.$id, {
          status: 'connected',
          lastRefresh: new Date().toISOString(),
          metadata: JSON.stringify({
            sessionId: doc.$id,
            csrfToken: generateToken(),
            lastPopupClose: new Date().toISOString(),
          }),
        })
      } else {
        await createDocument(COLLECTION_IDS.VTOP_CONNECTIONS, {
          userId,
          registrationNo,
          status: 'connected',
          connectedAt: new Date().toISOString(),
          autoRefresh: false,
          refreshInterval: 24 * 60 * 60 * 1000,
          lastRefresh: new Date().toISOString(),
          nextRefresh: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          failureCount: 0,
          metadata: JSON.stringify({
            sessionId: doc.$id,
            csrfToken: generateToken(),
          }),
        })
      }
    } catch (error) {
      console.error('[VTOP-SESSION] Error updating connection:', error)
      // Don't fail - session creation is still successful
    }

    console.log(`[VTOP-SESSION] Session created: ${doc.$id}`)

    return NextResponse.json({
      success: true,
      sessionId: doc.$id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  } catch (error) {
    console.error('[VTOP-SESSION] Error creating session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/vtop-session
 * Get current session status
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    const sessions = await listDocuments(COLLECTION_IDS.VTOP_SESSIONS, [
      `userId = "${userId}"`,
      `status = "active"`,
      `expiresAt > "${new Date().toISOString()}"`,
    ])

    if (sessions.documents.length === 0) {
      return NextResponse.json({ success: false, error: 'No active session' }, { status: 404 })
    }

    const session = sessions.documents[0]

    // Update lastUsed
    await updateDocument(COLLECTION_IDS.VTOP_SESSIONS, session.$id, {
      lastUsed: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      sessionId: session.$id,
      registrationNo: session.registrationNo,
      expiresAt: session.expiresAt,
    })
  } catch (error) {
    console.error('[VTOP-SESSION] Error getting session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get session' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/vtop-session
 * Revoke VTOP session
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    const sessions = await listDocuments(COLLECTION_IDS.VTOP_SESSIONS, [
      `userId = "${userId}"`
    ])

    // Revoke all sessions
    for (const session of sessions.documents) {
      await updateDocument(COLLECTION_IDS.VTOP_SESSIONS, session.$id, {
        status: 'revoked',
      })
    }

    // Update connection status
    const connections = await listDocuments(COLLECTION_IDS.VTOP_CONNECTIONS, [
      `userId = "${userId}"`
    ])

    if (connections.documents.length > 0) {
      await updateDocument(COLLECTION_IDS.VTOP_CONNECTIONS, connections.documents[0].$id, {
        status: 'disconnected',
        disconnectedAt: new Date().toISOString(),
      })
    }

    console.log(`[VTOP-SESSION] Sessions revoked for ${userId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[VTOP-SESSION] Error deleting session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}
