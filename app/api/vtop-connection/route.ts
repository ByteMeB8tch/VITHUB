// app/api/vtop-connection/route.ts - VTOP connection status with Appwrite
import { NextRequest, NextResponse } from 'next/server'
import { createDocument, updateDocument, listDocuments } from '@/lib/appwriteDb'
import { checkRateLimit } from '@/lib/security'
import { COLLECTION_IDS } from '@/lib/vtopModels'

/**
 * GET /api/vtop-connection
 * Get VTOP connection status
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    const connections = await listDocuments(COLLECTION_IDS.VTOP_CONNECTIONS, [
      `userId = "${userId}"`
    ])

    if (connections.documents.length === 0) {
      return NextResponse.json({
        success: true,
        connected: false,
        status: 'disconnected',
      })
    }

    const connection = connections.documents[0]

    return NextResponse.json({
      success: true,
      connected: connection.status === 'connected',
      status: connection.status,
      registrationNo: connection.registrationNo,
      connectedAt: connection.connectedAt,
      lastRefresh: connection.lastRefresh,
      autoRefresh: connection.autoRefresh,
      failureCount: connection.failureCount,
      lastError: connection.lastError,
    })
  } catch (error) {
    console.error('[VTOP-CONNECTION] Error getting status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get connection status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/vtop-connection
 * Initialize VTOP connection
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, registrationNo, autoRefresh = false } = await request.json()

    if (!userId || !registrationNo) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Rate limiting
    if (!checkRateLimit(userId, 20, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const now = new Date()
    const nextRefresh = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const connections = await listDocuments(COLLECTION_IDS.VTOP_CONNECTIONS, [
      `userId = "${userId}"`
    ])

    const connectionData = {
      userId,
      registrationNo,
      status: 'connected',
      connectedAt: now.toISOString(),
      lastRefresh: now.toISOString(),
      nextRefresh: nextRefresh.toISOString(),
      autoRefresh,
      refreshInterval: 24 * 60 * 60 * 1000,
      failureCount: 0,
      metadata: JSON.stringify({
        sessionId: '',
        csrfToken: '',
      }),
    }

    if (connections.documents.length > 0) {
      await updateDocument(COLLECTION_IDS.VTOP_CONNECTIONS, connections.documents[0].$id, connectionData)
    } else {
      await createDocument(COLLECTION_IDS.VTOP_CONNECTIONS, connectionData)
    }

    console.log(`[VTOP-CONNECTION] Connection initialized for ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'VTOP connection initialized',
    })
  } catch (error) {
    console.error('[VTOP-CONNECTION] Error initializing connection:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to initialize connection' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/vtop-connection
 * Update VTOP connection settings
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId, autoRefresh, refreshInterval } = await request.json()

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    const connections = await listDocuments(COLLECTION_IDS.VTOP_CONNECTIONS, [
      `userId = "${userId}"`
    ])

    if (connections.documents.length > 0) {
      await updateDocument(COLLECTION_IDS.VTOP_CONNECTIONS, connections.documents[0].$id, {
        autoRefresh,
        refreshInterval: refreshInterval || 24 * 60 * 60 * 1000,
      })
    }

    console.log(`[VTOP-CONNECTION] Settings updated for ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Settings updated',
    })
  } catch (error) {
    console.error('[VTOP-CONNECTION] Error updating settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/vtop-connection
 * Disconnect VTOP
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    const connections = await listDocuments(COLLECTION_IDS.VTOP_CONNECTIONS, [
      `userId = "${userId}"`
    ])

    if (connections.documents.length > 0) {
      await updateDocument(COLLECTION_IDS.VTOP_CONNECTIONS, connections.documents[0].$id, {
        status: 'disconnected',
        disconnectedAt: new Date().toISOString(),
      })
    }

    // Revoke sessions
    const sessions = await listDocuments(COLLECTION_IDS.VTOP_SESSIONS, [
      `userId = "${userId}"`
    ])

    for (const session of sessions.documents) {
      await updateDocument(COLLECTION_IDS.VTOP_SESSIONS, session.$id, {
        status: 'revoked',
      })
    }

    console.log(`[VTOP-CONNECTION] Disconnected ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'VTOP disconnected',
    })
  } catch (error) {
    console.error('[VTOP-CONNECTION] Error disconnecting:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
