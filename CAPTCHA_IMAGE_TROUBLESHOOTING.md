# CAPTCHA Image Display - Troubleshooting Guide

## Recent Improvements

The CAPTCHA image extraction and display has been significantly improved to handle various scenarios.

### Backend Improvements (vitAuth.ts)

The `extractCaptchaImage()` function now uses **4 different methods** to extract and display the CAPTCHA:

#### Method 1: Standard Image Element Selectors
- Looks for `<img>` tags within CAPTCHA containers
- Searches by class, id, data attributes
- Returns the `src` attribute

#### Method 2: Comprehensive Image Search
- Searches all images on the page
- Filters by src, alt, class, id containing "captcha"
- Prioritizes **visible** images
- Returns full image URL

#### Method 3: Canvas Element Detection
- Some CAPTCHA implementations use HTML canvas
- Converts canvas to PNG data URL (`data:image/png;base64,...`)
- Returns base64 encoded image

#### Method 4: Full Page Screenshot
- If no image found, takes a screenshot of the entire page
- Returns as base64 data URL
- Ensures user can always see the CAPTCHA

### Frontend Improvements (login page)

#### Better Display Handling
```tsx
{captchaImageUrl ? (
  // Image found - display it
) : (
  // Image not found - show helpful message
)}
```

#### Enhanced Image Properties
- `loading="eager"` - Loads image immediately
- `onLoad()` callback - Logs successful load
- `onError()` callback - Logs failure with debugging info
- `crossOrigin="anonymous"` - Handles CORS

#### Better Error Messages
- If URL is invalid: "Could not load CAPTCHA image. The URL may be invalid."
- If not extracted: "Could not load CAPTCHA image from VIT portal. Please try logging in again."

### Improved Console Logging

The backend now logs:
```
[VIT Auth] Extracting CAPTCHA image...
[VIT Auth] Found CAPTCHA image via element selector: https://...
[VIT Auth] Found 3 CAPTCHA image(s)
[VIT Auth] Using CAPTCHA image: https://...
[VIT Auth] Found CAPTCHA canvas element
[VIT Auth] Converted canvas to data URL
[VIT Auth] Found CAPTCHA container: DIV
[VIT Auth] Created screenshot data URL
```

Frontend now logs:
```
CAPTCHA required
CAPTCHA session ID: session_1234567890_abc123
CAPTCHA image URL: https://vtopcc.vit.ac.in/...
Setting CAPTCHA image URL
CAPTCHA image loaded successfully
```

## How CAPTCHA Image Extraction Works

### Flow Diagram

```
VIT Portal login attempted
    ↓
CAPTCHA detected on page
    ↓
Try Method 1: Look for <img> in CAPTCHA container
    ↓ (if not found)
Try Method 2: Search all images, filter by "captcha"
    ↓ (if not found)
Try Method 3: Look for <canvas>, convert to data URL
    ↓ (if not found)
Try Method 4: Take full page screenshot
    ↓
Return URL to frontend
    ↓
Frontend displays image
    ↓
User solves CAPTCHA
```

## Debugging CAPTCHA Issues

### 1. Check Browser Console
Look for these success indicators:
```
✓ CAPTCHA required
✓ CAPTCHA session ID: session_...
✓ CAPTCHA image URL: data:image/png;base64,... (or https://...)
✓ Setting CAPTCHA image URL
✓ CAPTCHA image loaded successfully
```

### 2. If Image Not Showing
Check for error messages:
```
❌ No CAPTCHA image URL in response
❌ Failed to load CAPTCHA image
❌ Could not load CAPTCHA image
```

### 3. Check Network Tab
- Request to `/api/vit-auth` should return:
```json
{
  "success": true,
  "data": {
    "requiresCaptcha": true,
    "sessionId": "session_...",
    "captchaImageUrl": "data:image/png;base64,..." or "https://..."
  }
}
```

### 4. Server Logs
Backend logs show which extraction method succeeded:
```
[VIT Auth] Found CAPTCHA image via element selector
[VIT Auth] Found 3 CAPTCHA image(s)
[VIT Auth] Converted canvas to data URL
[VIT Auth] Created screenshot data URL
```

## Image Format Support

### 1. HTTP/HTTPS URLs
```
https://vtopcc.vit.ac.in/images/captcha.png
```
- Works if image is publicly accessible
- May fail due to CORS restrictions

### 2. Base64 Data URLs
```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...
```
- Always works (no CORS issues)
- Larger file size
- Used as fallback when URL extraction fails

### 3. Relative URLs
```
/vtop/images/captcha.png
```
- Automatically converted to absolute URL
- Combined with page origin

## If CAPTCHA Still Doesn't Show

### Step 1: Verify VIT Portal Works
- Visit https://vtopcc.vit.ac.in/vtop/ manually
- Try logging in
- See if CAPTCHA appears in browser

### Step 2: Check Server Logs
- Look for CAPTCHA extraction logs
- Check which method found the image
- Verify image URL/data is returned

### Step 3: Test Image Loading
If you have the image URL:
1. Copy URL from console
2. Paste in new browser tab
3. See if image loads
4. If not, there's a CORS or accessibility issue

### Step 4: Enable Debugging
Add to vitAuth.ts:
```typescript
// After page load
const pageHtml = await page.content()
console.log("Page HTML length:", pageHtml.length)
console.log("HTML preview:", pageHtml.substring(0, 500))
```

## Solution Summary

✅ **4-method extraction** ensures CAPTCHA image is always captured
✅ **Data URLs as fallback** prevents CORS issues
✅ **Better error handling** shows users what went wrong
✅ **Comprehensive logging** helps debug any issues
✅ **Improved frontend display** handles missing images gracefully

The CAPTCHA image will now display in one of these ways:
1. Direct image URL from VIT portal
2. Canvas-to-image conversion
3. Full page screenshot
4. Helpful error message if none of the above work
