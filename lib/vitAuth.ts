// lib/vitauth.ts - Playwright version with all improvements
import { chromium, Browser, Page, BrowserContext } from 'playwright'
import crypto from 'crypto'

export interface CourseData {
  courseCode: string
  courseName: string
  courseType: string
  credits: number
  faculty: string
  slot: string
  attendance?: number
  grade?: string
}

export interface VITStudentData {
  name: string
  registrationNo: string
  email: string
  branch: string
  semester: string
  cgpa?: number
  credits?: number
  courses?: CourseData[]
  attendance?: number // Overall attendance
  sessionToken?: string
  lastLogin?: Date
}

export interface CaptchaRequired {
  requiresCaptcha: true
  captchaImageUrl: string
  sessionId: string
  timestamp: number
}

export interface AuthResult {
  success: boolean
  data?: VITStudentData
  captcha?: CaptchaRequired
  error?: string
  code?: string
}

// In-memory session storage
const sessionStore: Map<string, any> = new Map()

// Context tracking for Playwright (contexts don't have IDs)
const contextMap: Map<string, BrowserContext> = new Map()

// Shared browser instance
let sharedBrowser: Browser | null = null
let browserInitializing = false

// ============ ANTI-DETECTION & HUMAN BEHAVIOR HELPERS ============

// Random delay to mimic human behavior
const randomDelay = (min: number, max: number) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

// Human-like typing with random delays between keystrokes
const humanType = async (page: Page, selector: string, text: string) => {
  try {
    await page.click(selector)
    await randomDelay(100, 300)
    
    for (const char of text) {
      await page.type(selector, char, { delay: Math.random() * 150 + 50 }) // 50-200ms per keystroke
      if (Math.random() > 0.9) { // 10% chance of longer pause (like thinking)
        await randomDelay(200, 500)
      }
    }
    
    return true
  } catch (error) {
    console.error('[Human Type] Error:', error)
    return false
  }
}

// Anti-detection: Playwright has better built-in stealth, add extra measures
const makePageUndetectable = async (page: Page) => {
  await page.addInitScript(() => {
    // @ts-ignore - Override navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    })
    
    // Add chrome object with realistic properties
    // @ts-ignore
    if (!window.chrome) {
      // @ts-ignore
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      }
    }
    
    // Mock realistic plugins
    // @ts-ignore
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5].map(() => ({
        0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: true },
        description: 'Portable Document Format',
        filename: 'internal-pdf-viewer',
        length: 1,
        name: 'Chrome PDF Plugin'
      })),
    })
    
    // Mock languages
    // @ts-ignore
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    })
    
    // Mock platform
    // @ts-ignore
    Object.defineProperty(navigator, 'platform', {
      get: () => 'Win32',
    })
  })
}

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.isConnected()) {
    return sharedBrowser
  }

  if (browserInitializing) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return getBrowser()
  }

  browserInitializing = true

  try {
    sharedBrowser = await chromium.launch({
      headless: true, // Set to false for debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ]
    })

    console.log('[VIT Auth] Browser initialized with Playwright')
    return sharedBrowser
  } catch (error) {
    console.error('[VIT Auth] Failed to initialize browser:', error)
    throw error
  } finally {
    browserInitializing = false
  }
}

// Rate limiting
const rateLimiter = new Map<string, { count: number; timestamp: number }>()

function checkRateLimit(registrationNo: string): boolean {
  const now = Date.now()
  const userRate = rateLimiter.get(registrationNo)

  if (!userRate) {
    rateLimiter.set(registrationNo, { count: 1, timestamp: now })
    return true
  }

  if (now - userRate.timestamp > 60000) {
    rateLimiter.set(registrationNo, { count: 1, timestamp: now })
    return true
  }

  if (userRate.count >= 3) {
    return false
  }

  userRate.count++
  return true
}

// Session management
async function saveSession(sessionId: string, data: any, ttlSeconds = 1800): Promise<void> {
  sessionStore.set(sessionId, data)
  setTimeout(() => {
    sessionStore.delete(sessionId)
  }, ttlSeconds * 1000)
}

async function getSession(sessionId: string): Promise<any> {
  return sessionStore.get(sessionId) || null
}

async function deleteSession(sessionId: string): Promise<void> {
  sessionStore.delete(sessionId)
}

// ============ MAIN AUTHENTICATION FUNCTION ============
export async function authenticateVITPortal(
  registrationNo: string,
  password: string,
  userAgent?: string
): Promise<AuthResult> {
  const sessionId = `session_${crypto.randomBytes(16).toString('hex')}`

  // Check rate limit
  if (!checkRateLimit(registrationNo)) {
    return {
      success: false,
      error: 'Too many attempts. Please try again in a minute.',
      code: 'RATE_LIMITED',
    }
  }

  // Validate inputs
  if (!registrationNo || !password) {
    return {
      success: false,
      error: 'Registration number and password are required',
      code: 'INVALID_INPUT',
    }
  }

  // Validate registration number format
  const regNoRegex = /^\d{2}[A-Z]{3}\d{4}$/
  if (!regNoRegex.test(registrationNo)) {
    return {
      success: false,
      error: 'Invalid registration number format',
      code: 'INVALID_REGNO',
    }
  }

  let browser: Browser | null = null
  let context: BrowserContext | null = null
  let page: Page | null = null

  try {
    browser = await getBrowser()
    context = await browser.newContext({
      userAgent: userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    })
    
    // Generate a unique ID for this context
    const contextId = crypto.randomBytes(16).toString('hex')
    contextMap.set(contextId, context)
    
    page = await context.newPage()

    // Block unnecessary resources (Playwright uses route instead of setRequestInterception)
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType()
      // Only block stylesheets, fonts, and media - keep images for CAPTCHA
      if (['stylesheet', 'font', 'media'].includes(resourceType)) {
        route.abort()
      } else {
        route.continue()
      }
    })

    console.log(`[VIT Auth] Starting authentication for ${registrationNo}`)

    // Make page undetectable
    await makePageUndetectable(page)

    // Navigate to VTOP login with realistic timing
    await page.goto('https://vtopcc.vit.ac.in/vtop/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })

    // Human-like delay after page load (reading page)
    await randomDelay(1000, 2000)

    console.log('[VIT Auth] Login page loaded, looking for Student button...')

    // Wait for and click the "Student" button on the landing page
    try {
      // Wait for the Student form/button to appear
      await page.waitForSelector('form#stdForm, a[onclick*="stdForm"], img#student', {
        timeout: 10000,
        state: 'visible'
      })

      console.log('[VIT Auth] Student button found, clicking...')

      // Click the Student button - it's an <a> tag that submits the stdForm
      const studentButtonClicked = await page.evaluate(() => {
        // Method 1: Find the link that submits stdForm
        const stdFormLink = document.querySelector('a[onclick*="stdForm"]') as HTMLElement
        if (stdFormLink) {
          stdFormLink.click()
          console.log('[VIT Auth] Student button clicked via onclick link')
          return true
        }

        // Method 2: Submit the form directly
        const stdForm = document.querySelector('form#stdForm') as HTMLFormElement
        if (stdForm) {
          stdForm.submit()
          console.log('[VIT Auth] stdForm submitted directly')
          return true
        }

        // Method 3: Click the image or its parent
        const studentImg = document.querySelector('img#student')
        if (studentImg) {
          const clickableParent = studentImg.closest('a') as HTMLElement
          if (clickableParent) {
            clickableParent.click()
            console.log('[VIT Auth] Student button clicked via image parent')
            return true
          }
        }

        return false
      })

      if (!studentButtonClicked) {
        console.error('[VIT Auth] Could not find or click Student button')
        throw new Error('Could not find Student login button on VIT portal')
      }

      console.log('[VIT Auth] Student button clicked, waiting for login form...')

      // Wait for navigation to login form
      await new Promise(resolve => setTimeout(resolve, 3000))

    } catch (error) {
      console.error('[VIT Auth] Failed to click Student button:', error)
      throw new Error('Could not access Student login form. Please check VIT portal availability.')
    }

    // Wait for login form to be visible
    try {
      await page.waitForSelector('input[type="text"], input[name="username"]', { 
        timeout: 10000,
        state: 'visible' 
      })
    } catch (error) {
      console.error('[VIT Auth] Login form not found')
    }

    // Debug: Log all input fields on the page
    const availableInputs = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'))
      return inputs.map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        className: input.className
      }))
    })
    console.log('[VIT Auth] Available input fields:', JSON.stringify(availableInputs, null, 2))

    // *** HUMAN-LIKE FORM FILLING ***
    // Fill username with human-like typing
    await randomDelay(300, 700) // User locating the field
    const usernameFilled = await humanType(page, 'input#username, input[name="username"]', registrationNo.toUpperCase())
    
    if (!usernameFilled) {
      console.error('[VIT Auth] Failed to find username field. Page URL:', page.url())
      throw new Error('Could not find username field. The VIT login page structure may have changed.')
    }
    console.log('[FORM] Username filled with human-like behavior')

    // Small pause between fields (like a real user)
    await randomDelay(400, 900)

    // Fill password with human-like typing
    const passwordFilled = await humanType(page, 'input#password, input[name="password"], input[type="password"]', password)
    
    if (!passwordFilled) {
      console.error('[VIT Auth] Failed to find password field. Page URL:', page.url())
      throw new Error('Could not find password field. The VIT login page structure may have changed.')
    }
    console.log('[FORM] Password filled with human-like behavior')

    // Realistic pause after filling form (user reviewing input)
    await randomDelay(600, 1200)

    // *** FIX: Better CAPTCHA detection ***
    const captchaInfo = await page.evaluate(() => {
      const captchaSelectors = [
        'img[src*="captcha"]',
        'img[src*="Captcha"]',
        'img[alt*="captcha" i]',
        'input[name*="captcha" i]',
        'input[id*="captcha" i]',
        '.captcha-container',
        '#captcha',
        'img[src*="validateImg"]',
      ]

      let hasCaptcha = false
      
      for (const selector of captchaSelectors) {
        const element = document.querySelector(selector)
        if (element) {
          hasCaptcha = true
          console.log('[CAPTCHA DETECT] Found element:', selector)
          break
        }
      }
      
      return { hasCaptcha }
    })

    const hasCaptcha = captchaInfo.hasCaptcha

    if (hasCaptcha) {
      console.log(`[VIT Auth] CAPTCHA detected for ${registrationNo}`)

      // Extract CAPTCHA image
      const captchaImageUrl = await extractCaptchaImage(page)
      console.log('[VIT Auth] CAPTCHA image extracted, URL length:', captchaImageUrl?.length || 0)

      // *** FIX: Save session with password for retry ***
      // Generate CAPTCHA hash to track if it changes
      const captchaHash = crypto
        .createHash('sha256')
        .update(captchaImageUrl)
        .digest('hex')
        .substring(0, 16)

      const sessionData = {
        contextId: contextId,
        registrationNo,
        password, // Keep password for CAPTCHA retry
        pageUrl: page.url(),
        timestamp: Date.now(),
        captchaHash: captchaHash, // Track CAPTCHA state
        captchaAttempts: 0, // Track number of CAPTCHA attempts
      }

      await saveSession(sessionId, sessionData, 600) // 10 min TTL

      // *** CRITICAL FIX: Don't close the page! ***
      // Keep the page open so we can submit CAPTCHA later
      console.log('[VIT Auth] Keeping page open for CAPTCHA solving')
      console.log('[VIT Auth] CAPTCHA hash stored:', captchaHash)

      return {
        success: false,
        captcha: {
          requiresCaptcha: true,
          captchaImageUrl: captchaImageUrl || createPlaceholderImage(),
          sessionId,
          timestamp: Date.now(),
        },
      }
    }

    // If no CAPTCHA, attempt login directly - VIT uses button with id="submitBtn"
    const submitClicked = await page.evaluate(() => {
      const submitBtn = document.querySelector('button#submitBtn') as HTMLButtonElement
      if (submitBtn) {
        submitBtn.click()
        console.log('[VIT Auth] Submit button clicked')
        return true
      }
      return false
    })

    if (!submitClicked) {
      throw new Error('Could not find submit button')
    }
    
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }),
      page.waitForSelector('.error, .alert-danger, .text-danger', { timeout: 5000 }),
    ])

    // Check for login errors
    const hasError = await page.evaluate(() => {
      const errorSelectors = ['.error', '.alert-danger', '.text-danger', '[class*="error"]']
      return errorSelectors.some(selector => {
        const element = document.querySelector(selector)
        return element && element.textContent?.toLowerCase().includes('invalid')
      })
    })

    if (hasError) {
      await context.close()
      return {
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      }
    }

    console.log('[VIT Auth] Login successful, waiting for page to stabilize...')
    await randomDelay(2000, 3000)

    // Try to extract student data with multiple attempts
    let studentData = null
    let attempts = 0
    const maxAttempts = 3

    while (!studentData && attempts < maxAttempts) {
      attempts++
      console.log(`[VIT Auth] Data extraction attempt ${attempts}/${maxAttempts}`)
      
      studentData = await extractStudentData(page, registrationNo)
      
      if (!studentData && attempts < maxAttempts) {
        console.log('[VIT Auth] Retrying after delay...')
        await randomDelay(1000, 2000)
        
        // Try to navigate to dashboard/profile page if available
        try {
          const profileLinks = await page.$$eval('a', links => 
            links
              .filter(a => {
                const text = a.textContent?.toLowerCase() || ''
                const href = a.getAttribute('href') || ''
                return text.includes('profile') || 
                       text.includes('dashboard') || 
                       text.includes('home') ||
                       href.includes('profile') ||
                       href.includes('dashboard')
              })
              .map(a => a.getAttribute('href'))
              .filter(Boolean) as string[]
          )
          
          if (profileLinks.length > 0) {
            console.log('[VIT Auth] Found profile link, navigating:', profileLinks[0])
            try {
              await page.goto(`https://vtop.vit.ac.in${profileLinks[0]}`, { 
                waitUntil: 'networkidle',
                timeout: 10000 
              }).catch(() => {})
              await randomDelay(1000, 1500)
            } catch (e) {
              console.log('[VIT Auth] Could not navigate to profile')
            }
          }
        } catch (e) {
          console.log('[VIT Auth] Could not find profile links')
        }
      }
    }

    // If extraction still failed, use fallback data
    if (!studentData) {
      console.log('[VIT Auth] Data extraction failed, using fallback...')
      
      const branchCode = registrationNo.substring(2, 5).toUpperCase()
      const branchMap: Record<string, string> = {
        'BCE': 'Civil Engineering',
        'BCS': 'Computer Science',
        'ECE': 'Electronics & Communication',
        'EEE': 'Electrical & Electronics',
        'MEC': 'Mechanical Engineering',
        'CSE': 'Computer Science & Engineering',
        'BIT': 'Information Technology',
        'CHE': 'Chemical Engineering',
        'BIO': 'Biotechnology',
      }
      
      studentData = {
        name: `VIT Student`,
        registrationNo: registrationNo,
        email: `${registrationNo.toLowerCase()}@vitstudent.ac.in`,
        branch: branchMap[branchCode] || `${branchCode} Engineering`,
        semester: 'Current',
      }
    }

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const dataSessionId = `data_${sessionToken}`

    await saveSession(dataSessionId, {
      contextId: contextId,
      studentData,
      lastActive: Date.now(),
    }, 7200)

    studentData.sessionToken = sessionToken
    studentData.lastLogin = new Date()

    // Don't close context - keep it for data fetching
    console.log('[VIT Auth] Login successful, context kept open')

    return {
      success: true,
      data: studentData,
    }
  } catch (error) {
    console.error(`[VIT Auth] Error during authentication:`, error)

    if (page && !page.isClosed()) await page.close().catch(() => {})
    if (context) await context.close().catch(() => {})

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
      code: 'AUTH_ERROR',
    }
  }
}

// ============ CAPTCHA REFRESH FUNCTION ============
export async function refreshCaptchaImage(sessionId: string): Promise<{
  success: boolean
  captchaImageUrl?: string
  error?: string
  code?: string
}> {
  try {
    const sessionData = await getSession(sessionId)
    if (!sessionData) {
      return {
        success: false,
        error: 'Session expired or not found',
        code: 'SESSION_EXPIRED',
      }
    }

    // Check session age
    if (Date.now() - sessionData.timestamp > 10 * 60 * 1000) {
      await deleteSession(sessionId)
      return {
        success: false,
        error: 'Session expired',
        code: 'SESSION_EXPIRED',
      }
    }

    const browser = await getBrowser()
    const context = contextMap.get(sessionData.contextId)

    if (!context) {
      return {
        success: false,
        error: 'Browser context not found',
        code: 'CONTEXT_EXPIRED',
      }
    }

    const pages = await context.pages()
    const page = pages.find(p => !p.isClosed())

    if (!page) {
      return {
        success: false,
        error: 'Page not found',
        code: 'PAGE_EXPIRED',
      }
    }

    console.log('[CAPTCHA Refresh] Clicking refresh button...')

    // Click the CAPTCHA refresh button on VIT's page
    await page.evaluate(() => {
      const refreshBtn = document.querySelector('button[onclick*="loadCaptcha"], button#button-addon2, .btn-success')
      if (refreshBtn) {
        (refreshBtn as HTMLButtonElement).click()
        console.log('[CAPTCHA Refresh] Refresh button clicked')
        return true
      }
      return false
    })

    // Wait for new CAPTCHA to load
    await randomDelay(800, 1500)

    // Extract the new CAPTCHA image
    const newCaptchaImageUrl = await extractCaptchaImage(page)

    if (!newCaptchaImageUrl) {
      return {
        success: false,
        error: 'Failed to extract new CAPTCHA image',
        code: 'EXTRACTION_FAILED',
      }
    }

    // *** FIX: Update session hash and reset attempts ***
    const newCaptchaHash = crypto
      .createHash('sha256')
      .update(newCaptchaImageUrl)
      .digest('hex')
      .substring(0, 16)
    
    sessionData.captchaHash = newCaptchaHash
    sessionData.captchaAttempts = 0
    sessionData.timestamp = Date.now()
    await saveSession(sessionId, sessionData, 600)

    console.log('[CAPTCHA Refresh] New CAPTCHA image extracted, length:', newCaptchaImageUrl.length)
    console.log('[CAPTCHA Refresh] New CAPTCHA hash stored:', newCaptchaHash)

    return {
      success: true,
      captchaImageUrl: newCaptchaImageUrl,
    }

  } catch (error) {
    console.error('[CAPTCHA Refresh] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh CAPTCHA',
      code: 'REFRESH_ERROR',
    }
  }
}

// ============ CAPTCHA SOLVING FUNCTION ============
export async function solveCaptchaAndLogin(
  sessionId: string,
  captchaSolution: string
): Promise<AuthResult> {
  try {
    const sessionData = await getSession(sessionId)
    if (!sessionData) {
      return {
        success: false,
        error: 'Session expired or not found',
        code: 'SESSION_EXPIRED',
      }
    }

    // Check session age (10 minutes)
    if (Date.now() - sessionData.timestamp > 10 * 60 * 1000) {
      await deleteSession(sessionId)
      return {
        success: false,
        error: 'Session expired',
        code: 'SESSION_EXPIRED',
      }
    }

    // *** NEW FIX: Check if CAPTCHA has changed before processing ***
    if (sessionData.captchaAttempts >= 3) {
      console.log('[CAPTCHA] Too many failed attempts, requesting new CAPTCHA')
      
      const browser = await getBrowser()
      const context = contextMap.get(sessionData.contextId)
      
      if (context) {
        const pages = await context.pages()
        const page = pages.find(p => !p.isClosed())
        
        if (page) {
          try {
            // Try to refresh the page to get a new CAPTCHA
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {})
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            const newCaptchaImageUrl = await extractCaptchaImage(page)
            const newCaptchaHash = crypto
              .createHash('sha256')
              .update(newCaptchaImageUrl)
              .digest('hex')
              .substring(0, 16)
            
            sessionData.captchaHash = newCaptchaHash
            sessionData.captchaAttempts = 0
            await saveSession(sessionId, sessionData, 600)
            
            return {
              success: false,
              error: 'Too many failed attempts. New CAPTCHA generated.',
              code: 'MAX_ATTEMPTS_REACHED',
              captcha: {
                requiresCaptcha: true,
                captchaImageUrl: newCaptchaImageUrl,
                sessionId: sessionId,
                timestamp: Date.now()
              }
            }
          } catch (err) {
            console.error('[CAPTCHA] Error refreshing CAPTCHA:', err)
          }
        }
      }
      
      await deleteSession(sessionId)
      return {
        success: false,
        error: 'Too many failed attempts. Please login again.',
        code: 'MAX_ATTEMPTS_REACHED',
      }
    }

    const browser = await getBrowser()
    const context = contextMap.get(sessionData.contextId)

    if (!context) {
      await deleteSession(sessionId)
      return {
        success: false,
        error: 'Browser context not found',
        code: 'CONTEXT_EXPIRED',
      }
    }

    // *** FIX: Better page retrieval ***
    const pages = await context.pages()
    let page = pages.find(p => !p.isClosed())

    if (!page) {
      // Recreate page if needed
      page = await context.newPage()
      
      await page.goto('https://vtopcc.vit.ac.in/vtop/login', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Re-fill credentials (Playwright evaluate works differently)
      await page.evaluate(({ regNo, pwd }) => {
        const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement
        const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement
        
        if (usernameInput) {
          usernameInput.value = regNo
          usernameInput.dispatchEvent(new Event('input', { bubbles: true }))
        }
        if (passwordInput) {
          passwordInput.value = pwd
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }))
        }
      }, { regNo: sessionData.registrationNo, pwd: sessionData.password })
    }

    console.log('[VIT Auth] Page URL:', page.url())
    console.log('[VIT Auth] CAPTCHA solution to submit:', captchaSolution)

    // Make page undetectable
    await makePageUndetectable(page)

    // Human-like delay before interacting (user "reading" the CAPTCHA)
    await randomDelay(800, 1500)

    // Try to fill CAPTCHA with human-like typing
    let captchaFilled = false
    const captchaSelectors = [
      'input#captchaStr',
      'input[name="captchaStr"]',
      'input[name*="captcha" i]',
      'input[id*="captcha" i]',
    ]

    for (const selector of captchaSelectors) {
      try {
        const element = await page.$(selector)
        if (element) {
          // Move mouse to element (human-like)
          const box = await element.boundingBox()
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 })
            await randomDelay(100, 300)
          }

          // Click and clear field
          await element.click()
          await randomDelay(200, 400)
          await element.click({ clickCount: 3 }) // Select all
          await randomDelay(50, 150)

          // Type with human-like delays
          for (const char of captchaSolution) {
            await page.keyboard.type(char, { delay: Math.random() * 150 + 50 })
            // Random pause (like thinking/checking)
            if (Math.random() > 0.85) {
              await randomDelay(200, 500)
            }
          }

          console.log('[CAPTCHA] Filled via selector:', selector)
          captchaFilled = true
          break
        }
      } catch (err) {
        continue
      }
    }

    if (!captchaFilled) {
      return {
        success: false,
        error: 'Could not find CAPTCHA input field',
        code: 'CAPTCHA_FIELD_NOT_FOUND',
      }
    }

    // Human-like pause before clicking submit (user "reviewing" input)
    await randomDelay(500, 1200)

    // Submit form with human-like mouse movement
    const submitBtn = await page.$('button#submitBtn')
    if (!submitBtn) {
      throw new Error('Could not find submit button')
    }

    // Move mouse to submit button
    const submitBox = await submitBtn.boundingBox()
    if (submitBox) {
      await page.mouse.move(
        submitBox.x + submitBox.width / 2,
        submitBox.y + submitBox.height / 2,
        { steps: 15 } // Smooth mouse movement
      )
      await randomDelay(150, 350)
    }

    // Click with slight randomness
    await submitBtn.click({ delay: Math.random() * 50 + 20 })
    console.log('[CAPTCHA] Submit button clicked with human-like behavior')

    // Wait for response
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }),
      page.waitForSelector('.error, .alert-danger', { timeout: 5000 }),
    ]).catch(() => {})

    // Check for CAPTCHA error
    const hasCaptchaError = await page.evaluate(() => {
      const errorText = document.body.textContent?.toLowerCase() || ''
      return errorText.includes('captcha') && 
             (errorText.includes('invalid') || errorText.includes('wrong') || errorText.includes('incorrect'))
    })

    if (hasCaptchaError) {
      // VIT regenerated the CAPTCHA, extract the new one
      console.log('[CAPTCHA] Invalid CAPTCHA, extracting new one...')
      
      // *** FIX: Increment attempt counter ***
      sessionData.captchaAttempts = (sessionData.captchaAttempts || 0) + 1
      console.log(`[CAPTCHA] Attempt ${sessionData.captchaAttempts}/3`)
      
      const newCaptchaImageUrl = await extractCaptchaImage(page)
      const newCaptchaHash = crypto
        .createHash('sha256')
        .update(newCaptchaImageUrl)
        .digest('hex')
        .substring(0, 16)
      
      // Update session with new CAPTCHA hash
      sessionData.captchaHash = newCaptchaHash
      await saveSession(sessionId, sessionData, 600)
      
      console.log('[CAPTCHA] New CAPTCHA hash stored:', newCaptchaHash)
      
      return {
        success: false,
        error: 'Invalid CAPTCHA',
        code: 'INVALID_CAPTCHA',
        captcha: newCaptchaImageUrl ? {
          requiresCaptcha: true,
          captchaImageUrl: newCaptchaImageUrl,
          sessionId: sessionId,
          timestamp: Date.now()
        } : undefined
      }
    }

    // Extract student data with multiple attempts
    let studentData = await extractStudentData(page, sessionData.registrationNo)
    
    // If extraction failed, try navigating to different pages
    if (!studentData) {
      console.log('[VIT Auth] Initial extraction failed, trying alternative pages...')
      
      // Try waiting for specific page elements
      try {
        await page.waitForTimeout(2000)
        
        // Try to navigate to dashboard or student home
        const dashboardUrls = [
          'https://vtopcc.vit.ac.in/vtop/student/home',
          'https://vtopcc.vit.ac.in/vtop/student/dashboard',
          'https://vtop.vit.ac.in/student',
        ]
        
        for (const dashUrl of dashboardUrls) {
          try {
            console.log('[VIT Auth] Trying to navigate to:', dashUrl)
            await page.goto(dashUrl, { 
              waitUntil: 'networkidle', 
              timeout: 8000 
            }).catch(() => {})
            
            await page.waitForTimeout(1500)
            studentData = await extractStudentData(page, sessionData.registrationNo)
            
            if (studentData) {
              console.log('[VIT Auth] Successfully extracted data from:', dashUrl)
              break
            }
          } catch (e) {
            console.log('[VIT Auth] Failed to navigate to:', dashUrl, e instanceof Error ? e.message : '')
          }
        }
      } catch (e) {
        console.log('[VIT Auth] Alternative navigation failed')
      }
    }

    if (!studentData) {
      console.log('[VIT Auth] Could not extract student data, using fallback')
      
      // Fallback: Use registration number to generate basic data
      const branchCode = sessionData.registrationNo.substring(2, 5).toUpperCase()
      const branchMap: Record<string, string> = {
        'BCE': 'Civil Engineering',
        'BCS': 'Computer Science',
        'ECE': 'Electronics & Communication',
        'EEE': 'Electrical & Electronics',
        'MEC': 'Mechanical Engineering',
        'CSE': 'Computer Science & Engineering',
        'BIT': 'Information Technology',
        'CHE': 'Chemical Engineering',
        'BIO': 'Biotechnology',
      }
      
      studentData = {
        name: `VIT Student`,
        registrationNo: sessionData.registrationNo,
        email: `${sessionData.registrationNo.toLowerCase()}@vitstudent.ac.in`,
        branch: branchMap[branchCode] || `${branchCode} Engineering`,
        semester: 'Current',
      }
      
      console.log('[VIT Auth] Using fallback student data:', studentData)
    }

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const dataSessionId = `data_${sessionToken}`

    await saveSession(dataSessionId, {
      contextId: sessionData.contextId,
      studentData,
      lastActive: Date.now(),
    }, 7200)

    // Clean up CAPTCHA session
    await deleteSession(sessionId)

    studentData.sessionToken = sessionToken
    studentData.lastLogin = new Date()

    console.log('[VIT Auth] CAPTCHA solved, login successful')

    return {
      success: true,
      data: studentData,
    }
  } catch (error) {
    console.error(`[VIT Auth] CAPTCHA solving error:`, error)
    await deleteSession(sessionId).catch(() => {})

    return {
      success: false,
      error: error instanceof Error ? error.message : 'CAPTCHA solving failed',
      code: 'CAPTCHA_SOLVE_ERROR',
    }
  }
}

// ============ HELPER FUNCTIONS ============

async function extractStudentData(page: Page, registrationNo: string): Promise<VITStudentData | null> {
  try {
    console.log('[Student Data] Current URL:', page.url())
    console.log('[Student Data] Attempting to extract data for:', registrationNo)
    
    // Check if we're still on login page
    const isLoginPage = await page.evaluate(() => {
      const isOnLogin = 
        window.location.href.includes('/login') ||
        window.location.href.includes('/vtop/login') ||
        document.querySelector('form#vtopLoginForm') !== null ||
        document.querySelector('#username') !== null
      return isOnLogin
    })
    
    if (isLoginPage) {
      console.log('[Student Data] Still on login page, returning null')
      return null
    }
    
    // Navigate to the content page where detailed info is available
    console.log('[Student Data] Navigating to content page...')
    try {
      await page.goto('https://vtopcc.vit.ac.in/vtop/content', {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      }).catch(() => {})
      
      // Wait for page to stabilize
      await page.waitForTimeout(2000)
      console.log('[Student Data] Content page loaded:', page.url())
    } catch (e) {
      console.log('[Student Data] Could not navigate to content page, will try extracting from current page')
    }
    
    // Wait for page to be ready
    await page.waitForSelector('body', { timeout: 5000 }).catch(() => {})
    
    // Extract comprehensive student data from the page
    const pageData = await page.evaluate(() => {
      console.log('[Student Data] Extracting from page...')
      
      // Extract student name
      let name = ''
      const nameSelectors = [
        '.student-name', '.studentname', '#studentName', '#studentname',
        '.profile-name', '.profilename',
        '[id*="studentName"]', '[id*="StudentName"]',
        '[class*="studentName"]', '[class*="StudentName"]',
        '.welcome-msg', '.welcome-text', '.welcome', '[class*="welcome"]',
        '.navbar-text', '.nav-user', '.user-name', '.username', '.user-info',
        '.profile-header', '.profile-info',
        '.dropdown-toggle', '.user-dropdown',
        'nav span', 'header span'
      ]

      for (const selector of nameSelectors) {
        const elements = document.querySelectorAll(selector)
        if (elements.length === 0) continue
        
        elements.forEach(element => {
          if (name) return
          
          const text = element.textContent?.trim() || ''
          
          if (text.length > 2 && text.length < 150) {
            let cleanText = text
              .replace(/welcome|hi|hello|student|dear|mr|mrs|ms/gi, '')
              .replace(/logout|profile|settings|dashboard|home/gi, '')
              .trim()
            
            const words = cleanText.split(/\s+/).filter(word => 
              word.length > 1 && 
              !/^[0-9]+$/.test(word) &&
              !word.includes('@')
            )
            
            if (words.length > 0 && words.length <= 5) {
              name = words.slice(0, 4).join(' ')
            }
          }
        })
        if (name) break
      }
      
      // Extract CGPA
      let cgpa: number | null = null
      const cgpaSelectors = [
        '[id*="cgpa"]', '[class*="cgpa"]', '[id*="CGPA"]', '[class*="CGPA"]',
        'span:has-text("CGPA")', 'div:has-text("CGPA")'
      ]
      
      const bodyText = document.body.textContent || ''
      const cgpaMatch = bodyText.match(/CGPA[:\s]*([0-9]+\.[0-9]{1,2})/i)
      if (cgpaMatch && cgpaMatch[1]) {
        cgpa = parseFloat(cgpaMatch[1])
        console.log('[Student Data] Found CGPA:', cgpa)
      }
      
      // Extract credits
      let credits: number | null = null
      const creditsMatch = bodyText.match(/(?:credits|Credits|CREDITS)[:\s]*([0-9]+)/i)
      if (creditsMatch && creditsMatch[1]) {
        credits = parseInt(creditsMatch[1])
        console.log('[Student Data] Found Credits:', credits)
      }
      
      // Extract overall attendance
      let attendance: number | null = null
      const attendanceMatch = bodyText.match(/(?:attendance|Attendance|ATTENDANCE)[:\s]*([0-9]+(?:\.[0-9]{1,2})?)\s*%/i)
      if (attendanceMatch && attendanceMatch[1]) {
        attendance = parseFloat(attendanceMatch[1])
        console.log('[Student Data] Found Attendance:', attendance)
      }
      
      // Extract branch/programme
      let branch = ''
      const branchMatch = bodyText.match(/(?:Programme|Program|Branch)[:\s]*([A-Z\s]+(?:Engineering|Science|Technology))/i)
      if (branchMatch && branchMatch[1]) {
        branch = branchMatch[1].trim()
        console.log('[Student Data] Found Branch:', branch)
      }
      
      // Extract semester
      let semester = ''
      const semesterMatch = bodyText.match(/(?:Semester|Sem)[:\s]*([0-9]+|[IVX]+)/i)
      if (semesterMatch && semesterMatch[1]) {
        semester = semesterMatch[1]
        console.log('[Student Data] Found Semester:', semester)
      }
      
      // Extract courses from tables
      const courses: any[] = []
      const tables = document.querySelectorAll('table')
      
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr')
        let headers: string[] = []
        
        rows.forEach((row, index) => {
          const cells = Array.from(row.querySelectorAll('th, td'))
          const cellTexts = cells.map(cell => cell.textContent?.trim() || '')
          
          // Check if this is a header row
          if (index === 0 || row.querySelector('th')) {
            headers = cellTexts.map(h => h.toLowerCase())
            console.log('[Courses] Found headers:', headers)
          } else if (headers.length > 0 && cellTexts.length > 0) {
            // Check if this looks like a course row
            const hasCode = cellTexts.some(text => /^[A-Z]{3}[0-9]{3,4}/.test(text))
            const hasCredits = cellTexts.some(text => /^[0-9]$/.test(text))
            
            if (hasCode || hasCredits) {
              const courseObj: any = {}
              
              cellTexts.forEach((text, idx) => {
                const header = headers[idx] || `col${idx}`
                if (text && text.length > 0) {
                  // Map common column names
                  if (header.includes('code')) courseObj.courseCode = text
                  else if (header.includes('course') && header.includes('name')) courseObj.courseName = text
                  else if (header.includes('name') && !courseObj.courseName) courseObj.courseName = text
                  else if (header.includes('credit')) courseObj.credits = parseInt(text) || 0
                  else if (header.includes('faculty') || header.includes('instructor')) courseObj.faculty = text
                  else if (header.includes('slot')) courseObj.slot = text
                  else if (header.includes('type') || header.includes('category')) courseObj.courseType = text
                  else if (header.includes('attendance') || header.includes('attend')) {
                    const attMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*%/)
                    if (attMatch) courseObj.attendance = parseFloat(attMatch[1])
                  }
                  else if (header.includes('grade')) courseObj.grade = text
                  // If no header match, try to infer from content
                  else if (!courseObj.courseCode && /^[A-Z]{3}[0-9]{3,4}/.test(text)) courseObj.courseCode = text
                  else if (!courseObj.credits && /^[0-9]$/.test(text)) courseObj.credits = parseInt(text)
                }
              })
              
              if (courseObj.courseCode || courseObj.courseName) {
                courses.push(courseObj)
                console.log('[Courses] Found course:', courseObj)
              }
            }
          }
        })
      })
      
      return {
        name: name || null,
        cgpa,
        credits,
        attendance,
        branch,
        semester,
        courses: courses.length > 0 ? courses : null
      }
    })

    console.log('[Student Data] Page extraction result:', pageData)

    // If we couldn't find a name, return null
    if (!pageData.name || pageData.name.length < 2) {
      console.log('[Student Data] Could not extract valid student name')
      return null
    }

    // Clean up the name
    let finalName = pageData.name
      .replace(/[^a-zA-Z\s]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join(' ')

    // Determine branch from registration number if not found
    let branch = pageData.branch || 'Unknown'
    if (branch === 'Unknown' && registrationNo.length >= 8) {
      const branchCode = registrationNo.substring(2, 5).toUpperCase()
      const branchMap: Record<string, string> = {
        'BCE': 'Civil Engineering',
        'BCS': 'Computer Science',
        'ECE': 'Electronics & Communication',
        'EEE': 'Electrical & Electronics',
        'MEC': 'Mechanical Engineering',
        'CSE': 'Computer Science & Engineering',
        'BIT': 'Information Technology',
        'CHE': 'Chemical Engineering',
        'BIO': 'Biotechnology',
      }
      branch = branchMap[branchCode] || `${branchCode} Engineering`
    }

    const studentData: VITStudentData = {
      name: finalName,
      registrationNo,
      email: `${registrationNo.toLowerCase()}@vitstudent.ac.in`,
      branch,
      semester: pageData.semester || 'Current',
      cgpa: pageData.cgpa || undefined,
      credits: pageData.credits || undefined,
      attendance: pageData.attendance || undefined,
      courses: pageData.courses || undefined,
    }

    console.log('[Student Data] Final extracted data:', studentData)
    return studentData
  } catch (error) {
    console.error('[VIT Auth] Error extracting student data:', error)
    return null
  }
}

async function extractCaptchaImage(page: Page): Promise<string> {
  try {
    console.log('[CAPTCHA] Starting image extraction...')
    
    // First try to get data URL directly from the image source
    const captchaData = await page.evaluate(() => {
      const selectors = [
        'img.img-fluid.bg-light.border-0', // VIT specific class
        'img[src*="data:image"]',
        'img[src*="captcha"]',
        'img[src*="Captcha"]',
        '#captchaBlock img',
        '.input-group img',
        'img[alt*="captcha" i]',
      ]

      for (const selector of selectors) {
        const img = document.querySelector(selector) as HTMLImageElement
        if (img && img.src) {
          console.log('[CAPTCHA] Found image via:', selector)
          console.log('[CAPTCHA] Image src length:', img.src.length)
          
          // If it's already a data URL, return it
          if (img.src.startsWith('data:image')) {
            return { type: 'dataUrl', url: img.src }
          }
          
          // If it's a relative or absolute URL, return the full URL
          let fullUrl = img.src
          if (img.src.startsWith('/')) {
            fullUrl = window.location.origin + img.src
          }
          
          return { type: 'url', url: fullUrl }
        }
      }
      
      return null
    })

    if (captchaData?.type === 'dataUrl') {
      console.log('[CAPTCHA] Using data URL from page, length:', captchaData.url.length)
      return captchaData.url
    }

    // Try to take screenshot of CAPTCHA area
    console.log('[CAPTCHA] Taking screenshot...')
    
    const captchaBounds = await page.evaluate(() => {
      const selectors = ['img[src*="captcha"]', '.captcha-container', 'form img']
      
      for (const selector of selectors) {
        const element = document.querySelector(selector)
        if (element) {
          const rect = element.getBoundingClientRect()
          return {
            x: Math.max(0, rect.x - 10),
            y: Math.max(0, rect.y - 10),
            width: Math.min(rect.width + 20, 400),
            height: Math.min(rect.height + 20, 200),
          }
        }
      }
      
      return { x: 0, y: 200, width: 400, height: 150 }
    })
    
    const screenshot = await page.screenshot({
      clip: captchaBounds,
      type: 'png',
    })
    
    console.log('[CAPTCHA] Screenshot taken')
    // Playwright returns Buffer, convert to base64
    const base64 = screenshot.toString('base64')
    return `data:image/png;base64,${base64}`
    
  } catch (error) {
    console.error('[CAPTCHA] Error extracting image:', error)
    return createPlaceholderImage()
  }
}

function createPlaceholderImage(): string {
  const svg = `<svg width="300" height="100" xmlns="http://www.w3.org/2000/svg">
    <rect width="300" height="100" fill="#f5f5f5"/>
    <text x="150" y="50" text-anchor="middle" font-size="14" fill="#666">
      CAPTCHA Loading...
    </text>
  </svg>`
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

export async function fetchStudentData(
  sessionToken: string,
  dataType: 'attendance' | 'marks' | 'timetable' | 'profile'
): Promise<any> {
  const sessionId = `data_${sessionToken}`
  const sessionData = await getSession(sessionId)

  if (!sessionData) {
    throw new Error('Session expired or invalid')
  }

  await saveSession(sessionId, {
    ...sessionData,
    lastActive: Date.now(),
  })

  // TODO: Implement data fetching
  return null
}

export async function cleanup(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close()
    sharedBrowser = null
  }
  console.log('[VIT Auth] Cleanup completed')
}