// lib/security.ts - Security utilities (encryption, rate limiting, validation)
import crypto from 'crypto'

const ENCRYPTION_ALGORITHM = 'aes-256-gcm'

/**
 * Encrypt sensitive data (e.g., session cookies)
 * Uses AES-256-GCM for authenticated encryption
 */
export function encryptData(data: string, encryptionKey?: string): string {
  const key = Buffer.from(encryptionKey || process.env.ENCRYPTION_KEY || 'default-key', 'utf8')
    .slice(0, 32) // Ensure 32 bytes for AES-256

  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv)

  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Return: iv + authTag + encrypted data (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt encrypted data
 */
export function decryptData(encryptedData: string, encryptionKey?: string): string {
  const key = Buffer.from(encryptionKey || process.env.ENCRYPTION_KEY || 'default-key', 'utf8')
    .slice(0, 32)

  const [ivHex, authTagHex, encrypted] = encryptedData.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Hash sensitive data (one-way)
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Rate limiting - Track API calls per user
 * Returns true if request is allowed, false if rate limited
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  userId: string,
  maxRequests: number = 100,
  windowMs: number = 60 * 1000 // 1 minute default
): boolean {
  const now = Date.now()
  const userLimit = rateLimitStore.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    // New window or first request
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + windowMs,
    })
    return true
  }

  if (userLimit.count >= maxRequests) {
    return false // Rate limited
  }

  userLimit.count++
  return true
}

/**
 * Get rate limit info for a user
 */
export function getRateLimitInfo(userId: string) {
  const userLimit = rateLimitStore.get(userId)
  if (!userLimit) {
    return { remaining: 100, resetTime: Date.now() + 60000 }
  }

  return {
    remaining: Math.max(0, 100 - userLimit.count),
    resetTime: userLimit.resetTime,
  }
}

/**
 * Validate input to prevent injection attacks
 */
export function validateInput(
  data: string,
  type: 'registrationNo' | 'password' | 'email' | 'url' = 'email'
): boolean {
  const validators: Record<string, RegExp> = {
    registrationNo: /^[A-Z0-9]{10,15}$/i,
    password: /^.{6,128}$/, // At least 6 chars
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\/.+/i,
  }

  const regex = validators[type] || validators.email
  return regex.test(data?.trim() || '')
}

/**
 * Sanitize input to remove potential XSS vectors
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>\"']/g, '')
    .trim()
    .slice(0, 500) // Max 500 chars
}

/**
 * Generate secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token: string, sessionToken: string): boolean {
  return token === sessionToken
}
