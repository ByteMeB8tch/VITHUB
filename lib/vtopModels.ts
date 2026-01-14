// lib/vtopModels.ts - Appwrite document models for VTOP integration

/**
 * User VTOP Session - Stores encrypted session data temporarily
 * Auto-expires after 24 hours
 * Appwrite Collection: vtop_sessions
 */
export interface VTOPSessionDocument {
  $id?: string
  $createdAt?: string
  $updatedAt?: string
  userId: string // Reference to user
  registrationNo: string
  encryptedCookies: string // Encrypted session cookies
  encryptedSessionData: string // Encrypted session info
  status: 'active' | 'expired' | 'revoked'
  lastUsed: string // ISO date
  createdAt: string // ISO date
  expiresAt: string // ISO date - Auto-delete via TTL
  userAgent: string
  ipAddress?: string
}

/**
 * VTOP Scraped Data - Cached grades, attendance, profile
 * Appwrite Collection: vtop_data
 */
export interface VTOPDataDocument {
  $id?: string
  $createdAt?: string
  $updatedAt?: string
  userId: string
  registrationNo: string
  name: string
  email: string
  branch: string
  semester: string
  cgpa: number
  credits: number
  grades: string // JSON stringified array
  attendance: string // JSON stringified array
  lastScraped: string // ISO date
  scrapedAt: string // ISO date
  expiresAt: string // ISO date - Refresh every 24 hours
}

/**
 * User VTOP Connection - Track user's VTOP integration status
 * Appwrite Collection: vtop_connections
 */
export interface VTOPConnectionDocument {
  $id?: string
  $createdAt?: string
  $updatedAt?: string
  userId: string
  registrationNo: string
  status: 'connected' | 'disconnected' | 'pending'
  autoRefresh: boolean
  refreshInterval: number // milliseconds
  lastRefresh: string // ISO date
  nextRefresh: string // ISO date
  failureCount: number
  lastError?: string
  lastErrorTime?: string // ISO date
  connectedAt: string // ISO date
  disconnectedAt?: string // ISO date
  metadata: string // JSON stringified object
}

/**
 * VTOP Data Refresh Log - Audit trail
 * Appwrite Collection: vtop_refresh_logs
 */
export interface VTOPRefreshLogDocument {
  $id?: string
  $createdAt?: string
  $updatedAt?: string
  userId: string
  registrationNo: string
  status: 'success' | 'failed' | 'partial'
  reason?: string
  startTime: string // ISO date
  endTime: string // ISO date
  duration: number // milliseconds
  dataCountGrades: number
  dataCountAttendance: number
  errorMessage?: string
  errorCode?: string
  errorTimestamp?: string // ISO date
}

/**
 * Collection IDs for Appwrite
 * Make sure these collections exist in your Appwrite database
 */
export const COLLECTION_IDS = {
  VTOP_SESSIONS: 'vtop_sessions',
  VTOP_DATA: 'vtop_data',
  VTOP_CONNECTIONS: 'vtop_connections',
  VTOP_REFRESH_LOGS: 'vtop_refresh_logs',
} as const

/**
 * Helper to create Appwrite document from raw data
 */
export function createSessionDocument(data: Omit<VTOPSessionDocument, '$id' | '$createdAt' | '$updatedAt'>): VTOPSessionDocument {
  return {
    ...data,
    lastUsed: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

export function createDataDocument(data: Omit<VTOPDataDocument, '$id' | '$createdAt' | '$updatedAt'>): VTOPDataDocument {
  return {
    ...data,
    lastScraped: new Date().toISOString(),
    scrapedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

export function createConnectionDocument(data: Omit<VTOPConnectionDocument, '$id' | '$createdAt' | '$updatedAt'>): VTOPConnectionDocument {
  const now = new Date()
  return {
    ...data,
    connectedAt: now.toISOString(),
    lastRefresh: now.toISOString(),
    nextRefresh: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

export function createRefreshLogDocument(data: Omit<VTOPRefreshLogDocument, '$id' | '$createdAt' | '$updatedAt'>): VTOPRefreshLogDocument {
  return {
    ...data,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
  }
}
