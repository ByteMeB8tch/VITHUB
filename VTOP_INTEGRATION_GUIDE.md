# VTOP Integration System - Complete Setup Guide

## Overview

This document provides comprehensive setup and implementation guide for the VTOP (VIT Online Platform) integration system. The system allows users to:

1. Login to VTOP via a secure popup window
2. Automatically extract grades, attendance, and profile information
3. Store data securely with automatic expiration
4. Display data via an interactive dashboard
5. Refresh data on-demand with session management

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (React/Next.js)               │
├─────────────────────────────────────────────────────────┤
│  VTOPPopupManager    │    VTOPDashboard    │   Buttons  │
└──────────────────┬──────────────────────────────────────┘
                   │ (PostMessage API)
┌──────────────────┴──────────────────────────────────────┐
│         Backend APIs (Next.js Route Handlers)           │
├─────────────────────────────────────────────────────────┤
│  /api/vtop-session  │  /api/vtop-connection             │
│  /api/vtop-scrape   │  /api/vtop-data                   │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
    ┌───▼────────┐    ┌──────▼────────┐
    │  Puppeteer │    │   MongoDB     │
    │  Scraper   │    │   Database    │
    └────────────┘    └───────────────┘
        │                     │
        └─────────┬───────────┘
                  │
            ┌─────▼─────┐
            │ VTOP Portal│
            └───────────┘
```

## File Structure

```
app/
├── api/
│   ├── vtop-session/route.ts        # Session management
│   ├── vtop-connection/route.ts      # Connection status
│   ├── vtop-scrape/route.ts          # Data scraping trigger
│   └── vtop-data/route.ts            # Data retrieval
│
components/
├── VTOPPopupManager.tsx              # Popup window manager
└── VTOPDashboard.tsx                 # Data display component
│
lib/
├── mongodb.ts                        # Database connection
├── security.ts                       # Encryption & validation
├── vtopModels.ts                     # MongoDB schemas
├── vtopScraper.ts                    # Puppeteer scraper
└── vitAuth.ts                        # Existing VIT auth (keep)

.env.local                            # Configuration (create from .env.local.example)
```

## Installation & Setup

### 1. Install Dependencies

```bash
pnpm add mongodb puppeteer dotenv
pnpm add --save-dev @types/node
```

### 2. Configure Environment Variables

```bash
# Copy the example file
cp .env.local.example .env.local

# Edit .env.local with your values
nano .env.local
```

#### Required Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `MONGODB_DB` | Database name | `campushub` |
| `ENCRYPTION_KEY` | 32-char encryption key | `openssl rand -hex 16` |
| `VTOP_BASE_URL` | VTOP domain | `https://vtop.vit.ac.in` |
| `NEXT_PUBLIC_VTOP_URL` | Public VTOP URL | `https://vtop.vit.ac.in` |

### 3. Setup MongoDB

#### Option A: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Get connection string
5. Add to `.env.local`

#### Option B: Local MongoDB

```bash
# Windows
# Download from https://www.mongodb.com/try/download/community
# Run MongoDB service

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4. Initialize Database Indexes

Create a setup script:

```typescript
// scripts/setup-db.ts
import { connectToDatabase, getCollection } from '@/lib/mongodb'
import { createIndexes } from '@/lib/vtopModels'

async function setupDatabase() {
  try {
    const { db } = await connectToDatabase()
    await createIndexes(db)
    console.log('Database setup complete')
    process.exit(0)
  } catch (error) {
    console.error('Setup error:', error)
    process.exit(1)
  }
}

setupDatabase()
```

Run it:
```bash
npx ts-node scripts/setup-db.ts
```

## Usage Guide

### Frontend Implementation

#### 1. Add Popup Button in Dashboard

```typescript
// app/dashboard/page.tsx
'use client'

import { useState } from 'react'
import { VTOPPopupManager } from '@/components/VTOPPopupManager'
import { VTOPDashboard } from '@/components/VTOPDashboard'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext' // Your auth context

export default function DashboardPage() {
  const { user } = useAuth()
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [data, setData] = useState(null)

  return (
    <div className="p-6">
      <h1>Dashboard</h1>
      
      {!data ? (
        <>
          <Button onClick={() => setIsPopupOpen(true)}>
            Connect VTOP
          </Button>
          <VTOPPopupManager
            userId={user?.id || ''}
            isOpen={isPopupOpen}
            onOpenChange={setIsPopupOpen}
            onSuccess={(vtopData) => {
              setData(vtopData)
            }}
            onError={(error) => {
              console.error('VTOP error:', error)
            }}
          />
        </>
      ) : (
        <VTOPDashboard 
          userId={user?.id || ''}
          onDisconnect={() => setData(null)}
        />
      )}
    </div>
  )
}
```

#### 2. Create VTOP Login Page (Popup Target)

This page should handle VTOP login and send message to parent:

```typescript
// app/vtop-popup/page.tsx
'use client'

import { useState, useEffect } from 'react'

export default function VTOPPopupPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (registrationNo: string, password: string) => {
    setIsLoading(true)
    try {
      // Your existing VTOP auth logic
      const response = await fetch('/api/vit-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNo, password })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Get browser cookies (via API endpoint)
        const cookiesResponse = await fetch('/api/get-cookies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registrationNo })
        })
        
        const cookies = await cookiesResponse.json()

        // Send message to parent window
        window.opener.postMessage({
          type: 'VTOP_LOGIN_SUCCESS',
          registrationNo,
          cookies,
          sessionData: data
        }, window.location.origin)

        // Close popup
        setTimeout(() => window.close(), 1000)
      } else {
        window.opener.postMessage({
          type: 'VTOP_LOGIN_ERROR',
          error: 'Login failed'
        }, window.location.origin)
      }
    } catch (error: any) {
      window.opener.postMessage({
        type: 'VTOP_LOGIN_ERROR',
        error: error.message
      }, window.location.origin)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-form">
      {/* Your login form here */}
    </div>
  )
}
```

### Backend Implementation

#### API Endpoints Reference

##### 1. POST `/api/vtop-session`
Create a session after successful login

```bash
curl -X POST http://localhost:3000/api/vtop-session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "registrationNo": "REG123456",
    "cookies": [{"name": "sessionid", "value": "..."}],
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1"
  }'
```

Response:
```json
{
  "success": true,
  "sessionId": "6543210abcdef",
  "expiresAt": "2025-01-15T14:30:00Z"
}
```

##### 2. GET `/api/vtop-session?userId=user123`
Get current session status

##### 3. DELETE `/api/vtop-session`
Revoke all sessions

```bash
curl -X DELETE http://localhost:3000/api/vtop-session \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'
```

##### 4. POST `/api/vtop-scrape`
Trigger data scraping

```bash
curl -X POST http://localhost:3000/api/vtop-scrape \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "registrationNo": "REG123456",
    "sessionId": "6543210abcdef"
  }'
```

##### 5. GET `/api/vtop-scrape?userId=user123`
Get cached VTOP data

##### 6. GET `/api/vtop-connection?userId=user123`
Get connection status

##### 7. POST `/api/vtop-connection`
Initialize connection

##### 8. DELETE `/api/vtop-connection`
Disconnect VTOP

### Database Schema

#### vtop_sessions collection

```typescript
interface VTOPSessionDocument {
  _id: ObjectId
  userId: string
  registrationNo: string
  encryptedCookies: string // Encrypted browser cookies
  encryptedSessionData: string
  status: 'active' | 'expired' | 'revoked'
  lastUsed: Date
  createdAt: Date
  expiresAt: Date // TTL index for auto-deletion
  userAgent: string
  ipAddress: string
}
```

**Indexes:**
- `{ userId: 1, registrationNo: 1 }`
- `{ expiresAt: 1 }` (TTL: 0 - auto-delete on expiry)

#### vtop_data collection

```typescript
interface VTOPDataDocument {
  _id: ObjectId
  userId: string
  registrationNo: string
  name: string
  email: string
  branch: string
  semester: string
  cgpa: number
  credits: number
  grades: Array<{
    courseCode: string
    courseName: string
    faculty: string
    grade: string
    credits: number
    points: number
  }>
  attendance: Array<{
    courseCode: string
    courseName: string
    present: number
    total: number
    percentage: number
  }>
  lastScraped: Date
  scrapedAt: Date
  expiresAt: Date // Refreshed every 24 hours
}
```

**Indexes:**
- `{ userId: 1, registrationNo: 1 }`
- `{ expiresAt: 1 }` (TTL: 0)

#### vtop_connections collection

```typescript
interface VTOPConnectionDocument {
  _id: ObjectId
  userId: string
  registrationNo: string
  status: 'connected' | 'disconnected' | 'pending'
  autoRefresh: boolean
  refreshInterval: number
  lastRefresh: Date
  nextRefresh: Date
  failureCount: number
  lastError?: string
  connectedAt: Date
  metadata: {
    sessionId: string
    csrfToken: string
  }
}
```

## Security Features

### 1. Data Encryption

All sensitive data is encrypted using AES-256-GCM:

```typescript
// Encrypt
const encrypted = encryptData(JSON.stringify(cookies))

// Decrypt
const decrypted = JSON.parse(decryptData(encrypted))
```

### 2. Rate Limiting

- 100 requests per minute per user (default)
- 5 scrape requests per hour per user
- Tracked per endpoint

### 3. Session Expiration

- Sessions auto-delete after 24 hours
- MongoDB TTL index ensures automatic cleanup
- Data refreshes every 24 hours

### 4. CSRF Protection

- POST requests require `Content-Type: application/json`
- Tokens generated for sensitive operations
- Cross-origin checks on PostMessage

### 5. Input Validation

All inputs validated before processing:
- Registration number format
- Email format
- URL validation
- Password length requirements

### 6. Anti-Bot Measures

In Puppeteer scraper:
- Random delays between actions (500-2000ms)
- Realistic user agent
- Random mouse click positions
- Headless browser disguise
- Viewport randomization

## Troubleshooting

### Common Issues

#### 1. "Popup Blocked"
**Solution:**
- Disable popup blockers
- Ensure popup opens on user action (click)
- Use fallback manual method

#### 2. "Session Expired"
**Solution:**
```bash
# Reconnect by opening popup again
# Old sessions auto-delete after 24 hours
```

#### 3. "Failed to Scrape VTOP"
**Causes & Solutions:**
```
VTOP DOM Changed:
  → Update selectors in vtopScraper.ts

Timeout Error:
  → Increase SCRAPE_TIMEOUT in .env.local
  → Check VTOP availability

Authentication Failed:
  → Session expired (reconnect)
  → Cookies invalid (reconnect)
```

#### 4. "Rate Limit Exceeded"
**Solution:**
```bash
# Wait 1 hour for rate limit to reset
# Or contact admin to increase limits
```

#### 5. MongoDB Connection Error
**Solution:**
```bash
# Test connection
mongosh "MONGODB_URI"

# Check firewall rules
# Add IP to MongoDB whitelist (Atlas)
```

#### 6. Encryption Key Issues
**Solution:**
```bash
# Generate new key
openssl rand -hex 16

# Make sure it's 32+ characters
# Update ENCRYPTION_KEY in .env.local
```

## Performance Optimization

### 1. Caching

Data is cached for 24 hours:
- Prevents repeated VTOP scraping
- Reduces server load
- Faster user experience

### 2. Database Optimization

Indexes on frequently queried fields:
```bash
# Check index performance
db.vtop_data.aggregate([{$indexStats: {}}])
```

### 3. Puppeteer Optimization

```typescript
// Parallel browser instances (if needed)
const browser = await puppeteer.launch({
  args: [
    '--disable-dev-shm-usage',     // Reduce memory
    '--disable-gpu',                // Better performance
    '--no-sandbox'                  // Faster startup
  ]
})
```

### 4. API Response Compression

Add gzip compression:
```typescript
// middleware.ts
import { compress } from 'next-compress'

export const middleware = compress()
```

## Monitoring & Logging

### View Logs

```bash
# Check recent scraping logs
db.vtop_refresh_logs.find({}).sort({startTime: -1}).limit(10)

# Check errors
db.vtop_refresh_logs.find({status: 'failed'})

# Session activity
db.vtop_sessions.find({}).sort({lastUsed: -1})
```

### Metrics to Track

1. **Success Rate**: `successful_scrapes / total_scrapes`
2. **Avg Scrape Time**: Average duration of scraping
3. **Error Rate**: Failed scrapes / total scrapes
4. **Active Sessions**: Count of non-expired sessions
5. **User Engagement**: Daily active users connected

### Set Up Alerts

```typescript
// Background job to check failures
async function checkScrapeFailures() {
  const failures = await logsCollection.find({
    status: 'failed',
    startTime: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) }
  }).toArray()

  if (failures.length > 5) {
    // Send alert email/Slack notification
  }
}
```

## Deployment

### Render.com

1. Connect repository
2. Set environment variables in dashboard
3. Build command: `pnpm build`
4. Start command: `pnpm start`
5. Enable Cron Job for auto-refresh (optional)

### Railway.app

```yaml
# railway.toml
[environments.production]
builder = "nixpacks"

[build]
cmd = "pnpm build"

[start]
cmd = "pnpm start"
```

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm build

ENV NODE_ENV=production
CMD ["pnpm", "start"]
```

## Testing

### Unit Tests

```typescript
// __tests__/security.test.ts
import { encryptData, decryptData } from '@/lib/security'

describe('Security', () => {
  it('should encrypt and decrypt data', () => {
    const original = 'test data'
    const encrypted = encryptData(original)
    const decrypted = decryptData(encrypted)
    expect(decrypted).toBe(original)
  })
})
```

### Integration Tests

```bash
# Test VTOP session creation
curl -X POST http://localhost:3000/api/vtop-session \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### Load Testing

```bash
# Using Apache Bench
ab -n 100 -c 10 http://localhost:3000/api/vtop-connection?userId=test

# Using k6
k6 run load-test.js
```

## Future Enhancements

1. **Auto-Refresh**: Background job to refresh data daily
2. **Notifications**: Alert users of grade/attendance changes
3. **Export**: PDF/CSV export of grades and attendance
4. **Analytics**: Predict GPA, identify weak courses
5. **Mobile App**: Native app with offline support
6. **OAuth**: Allow VTOP to OAuth directly
7. **Multi-Account**: Support multiple VTOP accounts per user
8. **Dark Mode**: Theme support for dashboard

## Support & Resources

- **VTOP API Docs**: Check VTOP documentation for API changes
- **Puppeteer Docs**: https://pptr.dev
- **MongoDB Docs**: https://docs.mongodb.com
- **Next.js Docs**: https://nextjs.org/docs

## License

This implementation is provided as-is for educational purposes.

---

**Last Updated**: January 2025
**Version**: 1.0.0
