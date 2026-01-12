# CAPTCHA Integration from VIT Portal

## Overview
Your CampusHub login system now includes CAPTCHA verification from the VIT portal. When users attempt to log in and the VIT portal requires CAPTCHA, they will see the CAPTCHA image and can solve it directly in your application.

## How It Works

### 1. **Login Flow with CAPTCHA Detection**
   - User enters registration number and password
   - Request sent to `/api/vit-auth` endpoint
   - Backend (vitAuth.ts) connects to VIT portal using Puppeteer
   - If CAPTCHA is detected on VIT portal, the session is saved and image is extracted

### 2. **CAPTCHA Display**
   - Frontend detects CAPTCHA requirement from API response
   - Displays CAPTCHA image from VIT portal to the user
   - User solves the CAPTCHA in your application UI

### 3. **CAPTCHA Verification**
   - User submits their CAPTCHA solution
   - Request sent to `/api/vit-captcha` endpoint
   - Backend uses saved session to fill CAPTCHA solution
   - VIT portal is clicked to submit
   - If successful, student data is extracted and user is logged in

## Components Modified

### Frontend Changes
**File:** `app/login/page.tsx`
- Added `captchaImageUrl` state to store CAPTCHA image
- Updated CAPTCHA display section to show image from VIT portal
- Added uppercase conversion for CAPTCHA input
- Improved UX with image container and clearer instructions

### API Endpoints
**New File:** `app/api/vit-captcha/route.ts`
- Handles CAPTCHA solution submission
- Calls `solveCaptchaAndLogin()` function
- Returns student data on success or error on failure

### Backend Logic
**File:** `lib/vitAuth.ts` (Already Implemented)
- `authenticateVITPortal()` - Detects CAPTCHA and returns session
- `solveCaptchaAndLogin()` - Solves CAPTCHA using saved browser session
- `extractCaptchaImage()` - Extracts CAPTCHA image from page

## Key Features

✅ **Real CAPTCHA from VIT** - Uses actual CAPTCHA images from VIT portal
✅ **Browser Automation** - Puppeteer handles VIT portal interaction
✅ **Session Management** - Browser sessions stored temporarily for CAPTCHA solving
✅ **Auto-cleanup** - Sessions auto-delete after 30 minutes
✅ **Error Handling** - Clear error messages when CAPTCHA fails
✅ **User-Friendly UI** - Clean CAPTCHA display with instructions

## User Experience

1. User logs in with VIT credentials
2. If CAPTCHA is needed:
   - CAPTCHA image from VIT portal is displayed
   - User enters the text they see in the image
   - Solution is submitted
   - Backend verifies on actual VIT portal
   - If correct, user is automatically logged in

## Technical Stack

- **Frontend:** React, Next.js (TypeScript)
- **Backend:** Next.js API Routes
- **Browser Automation:** Puppeteer
- **Image Handling:** Native HTML img element with CORS support

## Error Handling

- Invalid CAPTCHA solution: "CAPTCHA verification failed. The solution may be incorrect."
- Session not found: "Session ID and CAPTCHA solution are required"
- Network errors: Clear error messages with fallback

## Security Notes

- Sessions are temporary (30-minute timeout)
- CAPTCHA solutions are never stored
- Passwords are never stored in your application
- Direct browser connection to VIT portal ensures data integrity

## Testing

To test CAPTCHA functionality:
1. Navigate to `/login`
2. Enter valid VIT registration number and password
3. If VIT portal shows CAPTCHA, you'll see it displayed in your app
4. Solve it and verify login works correctly

## Future Improvements

- Add CAPTCHA refresh button for better UX
- Implement CAPTCHA image caching
- Add audio CAPTCHA option if VIT portal provides it
- Implement retry logic with exponential backoff
