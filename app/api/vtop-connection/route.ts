// app/api/vtop-connection/route.ts - VTOP connection status and management
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase, getCollection } from '@/lib/mongodb'
import { checkRateLimit } from '@/lib/security'

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

    const connections = await getCollection('vtop_connections')
    const connection = await connections.findOne({ userId })

    if (!connection) {
      return NextResponse.json({
        success: true,
        connected: false,
        status: 'disconnected',
      })
    }

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
 * Initialize VTOP connection (call after successful popup login)
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

    const connections = await getCollection('vtop_connections')
    const result = await connections.updateOne(
      { userId },
      {
        $set: {
          userId,
          registrationNo,
          status: 'connected',
          connectedAt: new Date(),
          lastRefresh: new Date(),
          nextRefresh: new Date(Date.now() + 24 * 60 * 60 * 1000),
          autoRefresh,
          refreshInterval: 24 * 60 * 60 * 1000, // 24 hours
          failureCount: 0,
          metadata: {
            sessionId: '',
            csrfToken: '',
          },
        },
      },
      { upsert: true }
    )

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

    const connections = await getCollection('vtop_connections')
    await connections.updateOne(
      { userId },
      {
        $set: {
          autoRefresh,
          refreshInterval: refreshInterval || 24 * 60 * 60 * 1000,
        },
      }
    )

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

    const connections = await getCollection('vtop_connections')
    await connections.updateOne(
      { userId },
      {
        $set: {
          status: 'disconnected',
          disconnectedAt: new Date(),
        },
      }
    )

    // Also revoke sessions
    const sessions = await getCollection('vtop_sessions')
    await sessions.updateMany({ userId }, { $set: { status: 'revoked' } })

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
