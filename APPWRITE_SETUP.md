# VTOP Integration with Appwrite - Setup Guide

## Quick Start

This VTOP integration uses **Appwrite** (your existing database) instead of MongoDB.

## Appwrite Setup (Collections to Create)

You need to create 4 collections in your Appwrite database. Here's how:

### 1. Go to Appwrite Console

1. Visit https://cloud.appwrite.io
2. Select your project
3. Go to **Databases**
4. Select your database (or create one named `campushub` if using a new database)

### 2. Create Collections

Create these 4 collections in your database:

#### Collection 1: `vtop_sessions`
Stores encrypted VTOP session cookies (auto-expires after 24 hours)

**Attributes:**
- `userId` (String, Required)
- `registrationNo` (String, Required)
- `encryptedCookies` (String, Required) - Encrypted cookies
- `encryptedSessionData` (String, Required)
- `status` (String, Required) - Values: `active`, `expired`, `revoked`
- `lastUsed` (DateTime, Required)
- `createdAt` (DateTime, Required)
- `expiresAt` (DateTime, Required) - TTL: Auto-delete after 24h
- `userAgent` (String)
- `ipAddress` (String)

**Indexes:**
- Composite: `userId` + `registrationNo`
- Single: `status`
- Single: `expiresAt` (for TTL)

#### Collection 2: `vtop_data`
Stores scraped grades, attendance, and profile data

**Attributes:**
- `userId` (String, Required)
- `registrationNo` (String, Required)
- `name` (String, Required)
- `email` (String, Required)
- `branch` (String)
- `semester` (String)
- `cgpa` (Float)
- `credits` (Integer)
- `grades` (String) - JSON stringified array
- `attendance` (String) - JSON stringified array
- `lastScraped` (DateTime)
- `scrapedAt` (DateTime)
- `expiresAt` (DateTime) - TTL: Auto-delete after 24h

**Indexes:**
- Composite: `userId` + `registrationNo`
- Single: `expiresAt` (for TTL)

#### Collection 3: `vtop_connections`
Tracks VTOP connection status for each user

**Attributes:**
- `userId` (String, Required)
- `registrationNo` (String, Required)
- `status` (String, Required) - Values: `connected`, `disconnected`, `pending`
- `autoRefresh` (Boolean)
- `refreshInterval` (Integer) - Milliseconds
- `lastRefresh` (DateTime)
- `nextRefresh` (DateTime)
- `failureCount` (Integer)
- `lastError` (String)
- `lastErrorTime` (DateTime)
- `connectedAt` (DateTime)
- `disconnectedAt` (DateTime)
- `metadata` (String) - JSON stringified object

**Indexes:**
- Single: `userId`
- Single: `registrationNo`
- Single: `status`

#### Collection 4: `vtop_refresh_logs`
Audit trail for VTOP data refresh operations

**Attributes:**
- `userId` (String, Required)
- `registrationNo` (String, Required)
- `status` (String, Required) - Values: `success`, `failed`, `partial`
- `reason` (String)
- `startTime` (DateTime)
- `endTime` (DateTime)
- `duration` (Integer) - Milliseconds
- `dataCountGrades` (Integer)
- `dataCountAttendance` (Integer)
- `errorMessage` (String)
- `errorCode` (String)
- `errorTimestamp` (DateTime)

**Indexes:**
- Composite: `userId` + `registrationNo`
- Single: `status`

### Step-by-Step: Creating Collections in Appwrite

1. **In Appwrite Console:**
   - Click **Databases** → Select your database
   - Click **Create Collection**
   - Enter Collection ID: `vtop_sessions`
   - Click **Create**

2. **Add Attributes:**
   - Click the collection
   - For each attribute, click **+ Attribute**
   - Select type and configure as above
   - Save each attribute

3. **Create Indexes:**
   - Go to **Indexes** tab
   - Click **+ Index**
   - Select attributes and type (Unique or Non-unique)
   - Save

4. **Repeat for other 3 collections**

### TTL (Time-to-Live) Index in Appwrite

For auto-deletion of expired sessions:

1. Go to collection **Settings**
2. Set **expiresAt** as TTL field
3. Appwrite will auto-delete documents when `expiresAt` timestamp is reached

## Configuration

### Update .env.local

```bash
# Copy the template
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Your existing Appwrite config
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=campushub

# VTOP config
VTOP_BASE_URL=https://vtop.vit.ac.in
NEXT_PUBLIC_VTOP_URL=https://vtop.vit.ac.in

# Security - Generate a 32-char key
ENCRYPTION_KEY=abcdef1234567890abcdef1234567890

# Other config
PUPPETEER_DISABLE_SANDBOX=true
PUPPETEER_HEADLESS=true
```

### Generate Encryption Key

```bash
# Linux/Mac
openssl rand -hex 16

# Windows PowerShell
$bytes = New-Object byte[] 16
[System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes)
[System.Convert]::ToHexString($bytes)
```

Use the first 32 characters as `ENCRYPTION_KEY`.

## Installation

### 1. Install Dependencies

```bash
pnpm add puppeteer
```

### 2. Verify Appwrite Collections

```bash
# Test connection to your Appwrite database
# (You can use Appwrite console to verify collections exist)
```

## Usage

### Frontend Integration

Add to your dashboard page:

```typescript
'use client'

import { useState } from 'react'
import { VTOPPopupManager } from '@/components/VTOPPopupManager'
import { VTOPDashboard } from '@/components/VTOPDashboard'
import { Button } from '@/components/ui/button'
import { useUser } from '@/lib/auth-context' // Your auth hook

export default function Page() {
  const { user } = useUser()
  const [isConnected, setIsConnected] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)

  return (
    <div className="p-6">
      {!isConnected ? (
        <>
          <Button onClick={() => setPopupOpen(true)}>
            Connect VTOP
          </Button>
          <VTOPPopupManager
            userId={user?.id || ''}
            isOpen={popupOpen}
            onOpenChange={setPopupOpen}
            onSuccess={() => setIsConnected(true)}
          />
        </>
      ) : (
        <VTOPDashboard userId={user?.id || ''} />
      )}
    </div>
  )
}
```

### API Endpoints Available

#### 1. Create Session
```bash
POST /api/vtop-session
{
  "userId": "user123",
  "registrationNo": "REG123456",
  "cookies": [...],
  "userAgent": "Mozilla/5.0..."
}
```

#### 2. Get Session
```bash
GET /api/vtop-session?userId=user123
```

#### 3. Get VTOP Data
```bash
GET /api/vtop-scrape?userId=user123
```

#### 4. Trigger Scrape
```bash
POST /api/vtop-scrape
{
  "userId": "user123",
  "registrationNo": "REG123456",
  "sessionId": "session123"
}
```

#### 5. Check Connection
```bash
GET /api/vtop-connection?userId=user123
```

#### 6. Disconnect
```bash
DELETE /api/vtop-connection
{
  "userId": "user123"
}
```

## Troubleshooting

### "Collection not found" Error

**Solution:**
- Make sure you created all 4 collections in Appwrite
- Verify collection names match exactly:
  - `vtop_sessions`
  - `vtop_data`
  - `vtop_connections`
  - `vtop_refresh_logs`
- Check `NEXT_PUBLIC_APPWRITE_DATABASE_ID` is correct

### "Appwrite service error" in Logs

**Solution:**
1. Check Appwrite console for errors
2. Verify database permissions
3. Check API keys in `.env.local`
4. Make sure collections exist

### Encryption Key Issues

**Solution:**
```bash
# If you get decryption errors, regenerate key
# 1. Generate new 32-char key
# 2. Update ENCRYPTION_KEY in .env.local
# 3. Old encrypted data won't decrypt, but new data will work
# 4. Users need to reconnect VTOP
```

### Sessions Not Deleting After 24 Hours

**Solution:**
- In Appwrite Console → Collections → `vtop_sessions`
- Go to **Settings**
- Set `expiresAt` as the TTL field
- Appwrite will auto-delete expired documents

### Puppeteer Not Working

**Solution:**
```bash
# Install Puppeteer chrome browser
pnpm add @chromium/chromium-bin

# Update .env.local
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome

# For Render deployment
PUPPETEER_DISABLE_SANDBOX=true
PUPPETEER_HEADLESS=true
```

## Database Migration (if moving from MongoDB)

If you previously used MongoDB, you need to:

1. Create Appwrite collections (as above)
2. Old MongoDB data is separate - can be kept or deleted
3. New VTOP data will be stored in Appwrite
4. Users need to reconnect their VTOP accounts

## Security Notes

1. **Encryption:** Session cookies are AES-256 encrypted
2. **Rate Limiting:** Built-in rate limiting per user
3. **Session Expiry:** Automatic 24-hour expiration
4. **Anti-Bot Measures:** Random delays and delays in Puppeteer
5. **Input Validation:** All inputs validated before processing

## Monitoring & Logs

View activity in Appwrite:

1. Go to **Collections** → `vtop_refresh_logs`
2. See all scraping operations and their status
3. Check timestamps and error messages

View connection status:

1. Go to **Collections** → `vtop_connections`
2. See which users are connected
3. Check failure counts and last errors

## Production Deployment

### For Render.com

```yaml
# render.yaml
services:
  - type: web
    name: campushub
    env: node
    buildCommand: pnpm build
    startCommand: pnpm start
    envVars:
      - key: ENCRYPTION_KEY
        scope: pr
        value: your-32-char-key
      - key: PUPPETEER_DISABLE_SANDBOX
        value: "true"
      - key: PUPPETEER_HEADLESS
        value: "true"
```

### For Railway.app

```toml
# railway.toml
[build]
builder = "nixpacks"
cmd = "pnpm build"

[start]
cmd = "pnpm start"
```

Set environment variables in Railway Dashboard.

## Testing

Test the complete flow:

1. **Start dev server:**
   ```bash
   pnpm dev
   ```

2. **Open dashboard and click "Connect VTOP"**

3. **Login to VTOP in popup**

4. **Check Appwrite console:**
   - `vtop_sessions` → New session document created
   - `vtop_connections` → Status = "connected"
   - `vtop_data` → Grades and attendance stored
   - `vtop_refresh_logs` → Success log created

5. **Dashboard shows data:**
   - Grades, attendance, GPA displayed
   - Charts render correctly

## Next Steps

1. Create Appwrite collections (following steps above)
2. Update `.env.local` with your Appwrite details
3. Install Puppeteer: `pnpm add puppeteer`
4. Start dev server: `pnpm dev`
5. Test the flow on your dashboard
6. Deploy to production

---

**Questions?** Check the main [VTOP_INTEGRATION_GUIDE.md](./VTOP_INTEGRATION_GUIDE.md) for more details.
