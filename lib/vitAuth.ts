import puppeteer, { Browser, Page } from "puppeteer"

export interface VITStudentData {
  name: string
  registrationNo: string
  email: string
  branch: string
  semester: string
}

export interface CaptchaRequired {
  requiresCaptcha: true
  captchaImageUrl?: string
  captchaText?: string
  sessionId: string
}

// Store browser sessions for CAPTCHA handling
const activeSessions: Map<string, { browser: Browser; page: Page }> = new Map()

// Mock student data for testing
const mockStudentDatabase: Record<string, VITStudentData> = {
  "24BCE1045": {
    name: "Sample Student",
    registrationNo: "24BCE1045",
    email: "24bce1045@vitstudent.ac.in",
    branch: "BCE",
    semester: "5",
  },
  "24BCS1001": {
    name: "John Doe",
    registrationNo: "24BCS1001",
    email: "24bcs1001@vitstudent.ac.in",
    branch: "BCS",
    semester: "5",
  },
}

export async function authenticateVITPortal(
  registrationNo: string,
  password: string
): Promise<VITStudentData | CaptchaRequired | null> {
  let browser: Browser | null = null

  try {
    console.log(`[VIT Auth] Authenticating: ${registrationNo}`)

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 720 })
    page.setDefaultTimeout(30000)

    console.log(`[VIT Auth] Navigating to VTOPCC portal...`)

    await page.goto("https://vtopcc.vit.ac.in/vtop/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    })

    // Wait for page to load
    await page.waitForFunction(() => document.readyState === "complete").catch(() => {})
    await new Promise(r => setTimeout(r, 1000))

    console.log(`[VIT Auth] Looking for Student tab...`)

    // Click on Student tab
    const studentTab = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('a, button, div[role="tab"]'))
      const studentTabEl = tabs.find(el => 
        el.textContent?.toLowerCase().includes('student')
      )
      if (studentTabEl) {
        (studentTabEl as HTMLElement).click()
        return true
      }
      return false
    })

    if (!studentTab) {
      console.log(`[VIT Auth] Student tab not found, proceeding with current tab`)
    }

    await new Promise(r => setTimeout(r, 1500))

    console.log(`[VIT Auth] Filling credentials...`)

    // Try multiple ways to find and fill username field
    const usernameFillers = [
      async () => {
        const input = await page.$('input[name="username"]')
        if (input) {
          await input.click({ offset: { x: 0, y: 0 } })
          await input.type(registrationNo, { delay: 50 })
          return true
        }
        return false
      },
      async () => {
        const inputs = await page.$$('input[type="text"]')
        if (inputs.length > 0) {
          await inputs[0].click({ offset: { x: 0, y: 0 } })
          await inputs[0].type(registrationNo, { delay: 50 })
          return true
        }
        return false
      },
      async () => {
        const input = await page.$('input')
        if (input) {
          await input.click({ offset: { x: 0, y: 0 } })
          await input.type(registrationNo, { delay: 50 })
          return true
        }
        return false
      },
    ]

    for (const filler of usernameFillers) {
      if (await filler()) {
        console.log(`[VIT Auth] Username filled`)
        break
      }
    }

    await new Promise(r => setTimeout(r, 500))

    // Try multiple ways to find and fill password field
    const passwordFillers = [
      async () => {
        const input = await page.$('input[name="password"]')
        if (input) {
          await input.click({ offset: { x: 0, y: 0 } })
          await input.type(password, { delay: 50 })
          return true
        }
        return false
      },
      async () => {
        const inputs = await page.$$('input[type="password"]')
        if (inputs.length > 0) {
          await inputs[0].click({ offset: { x: 0, y: 0 } })
          await inputs[0].type(password, { delay: 50 })
          return true
        }
        return false
      },
    ]

    for (const filler of passwordFillers) {
      if (await filler()) {
        console.log(`[VIT Auth] Password filled`)
        break
      }
    }

    await new Promise(r => setTimeout(r, 500))

    // Click login button
    const loginButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const loginBtn = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('login') ||
        btn.textContent?.toLowerCase().includes('submit') ||
        btn.textContent?.toLowerCase().includes('sign')
      )
      if (loginBtn) {
        (loginBtn as HTMLElement).click()
        return true
      }
      return false
    })

    console.log(`[VIT Auth] Login button clicked: ${loginButton}`)

    // Wait for navigation or CAPTCHA detection
    await Promise.race([
      page.waitForNavigation({ timeout: 10000 }).catch(() => null),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ])

    // Check if CAPTCHA is present
    const pageContent = await page.content()
    const hasCaptcha = await page.evaluate(() => {
      const content = document.body.innerHTML.toLowerCase()
      const hasCaptchaKeyword = content.includes('captcha') || 
                                content.includes('recaptcha') ||
                                content.includes('verify')
      const hasCaptchaElement = !!document.querySelector('[class*="captcha"]') ||
                                !!document.querySelector('[id*="captcha"]') ||
                                !!document.querySelector('[src*="captcha"]')
      return hasCaptchaKeyword || hasCaptchaElement
    })

    if (hasCaptcha) {
      console.log(`[VIT Auth] CAPTCHA detected, storing session...`)
      console.log(`[VIT Auth] Current URL: ${page.url()}`)

      // Get page content for debugging
      const pageTitle = await page.title()
      console.log(`[VIT Auth] Page title: ${pageTitle}`)

      // Store session for later CAPTCHA solving
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      activeSessions.set(sessionId, { browser, page })

      // Set timeout to clean up after 30 minutes
      setTimeout(() => {
        console.log(`[VIT Auth] Session ${sessionId} timed out, cleaning up`)
        activeSessions.delete(sessionId)
      }, 30 * 60 * 1000)

      return {
        requiresCaptcha: true,
        sessionId,
        captchaImageUrl: await extractCaptchaImage(page),
      }
    }

    // Check if login was successful by looking for student data
    const studentData = await page.evaluate(() => {
      // Look for student name/info in common locations
      const nameElement = document.querySelector('[class*="name"]') ||
        document.querySelector('[class*="student"]') ||
        document.querySelector('h1') ||
        document.querySelector('h2')
      
      const name = nameElement?.textContent?.trim() || "Unknown"
      return name !== "Unknown" ? name : null
    })

    if (studentData) {
      console.log(`[VIT Auth] Login successful, extracted: ${studentData}`)
      await browser.close()
      return {
        name: studentData,
        registrationNo,
        email: `${registrationNo}@vitstudent.ac.in`,
        branch: extractBranch(registrationNo),
        semester: "5",
      }
    }

    // If neither CAPTCHA nor success, close and return null
    console.log(`[VIT Auth] Could not determine login status`)
    await browser.close()
    return null
  } catch (error) {
    console.error(`[VIT Auth] Error:`, error instanceof Error ? error.message : error)
    if (browser) {
      await browser.close().catch(() => {})
    }
    return null
  }
}

export async function solveCaptchaAndLogin(
  sessionId: string,
  captchaSolution: string
): Promise<VITStudentData | null> {
  console.log(`[VIT Auth] Looking for session: ${sessionId}`)
  console.log(`[VIT Auth] Active sessions count: ${activeSessions.size}`)
  console.log(`[VIT Auth] Active session IDs:`, Array.from(activeSessions.keys()))
  
  const session = activeSessions.get(sessionId)

  if (!session) {
    console.error(`[VIT Auth] Session ${sessionId} not found`)
    console.error(`[VIT Auth] Available sessions:`, Array.from(activeSessions.keys()))
    return null
  }

  const { browser, page } = session
  
  // Check if browser and page are still valid
  try {
    const isConnected = browser.isConnected()
    console.log(`[VIT Auth] Browser is connected: ${isConnected}`)
    if (!isConnected) {
      console.error(`[VIT Auth] Browser is disconnected`)
      activeSessions.delete(sessionId)
      return null
    }
  } catch (error) {
    console.error(`[VIT Auth] Error checking browser connection:`, error)
    activeSessions.delete(sessionId)
    return null
  }

  try {
    console.log(`[VIT Auth] Solving CAPTCHA for session ${sessionId}...`)
    console.log(`[VIT Auth] CAPTCHA solution (exact): "${captchaSolution}"`)
    console.log(`[VIT Auth] Solution length: ${captchaSolution.length}`)

    if (!captchaSolution) {
      console.error(`[VIT Auth] CAPTCHA solution is empty`)
      return null
    }

    // Wait a moment before interacting
    await new Promise(r => setTimeout(r, 500))

    // First, try to find and clear any existing CAPTCHA input
    const foundInput = await page.evaluate(async (solution: string) => {
      console.log(`[Browser] Looking for CAPTCHA input field...`)
      const inputs = Array.from(document.querySelectorAll('input'))
      console.log(`[Browser] Found ${inputs.length} input fields`)
      
      // List all inputs for debugging
      inputs.forEach((input, index) => {
        if (input.type === 'text' || input.type === 'password' || input.type === '') {
          console.log(`[Browser] Input ${index}: type=${input.type}, name=${(input as any).name}, id=${input.id}, placeholder=${input.placeholder}`)
        }
      })
      
      // Try to find CAPTCHA input by various attributes
      for (const input of inputs) {
        const attrs = {
          placeholder: input.placeholder,
          name: (input as any).name,
          id: input.id,
          className: input.className,
          type: input.type
        }
        
        const isCaptcha = 
          input.placeholder.toLowerCase().includes('captcha') ||
          (input as any).name?.toLowerCase().includes('captcha') ||
          input.id.toLowerCase().includes('captcha') ||
          input.className.toLowerCase().includes('captcha') ||
          input.getAttribute('data-captcha') !== null
        
        if (isCaptcha) {
          console.log(`[Browser] Found CAPTCHA input:`, attrs)
          // Clear existing value
          input.value = ''
          input.dispatchEvent(new Event('change', { bubbles: true }))
          input.dispatchEvent(new Event('blur', { bubbles: true }))
          
          // Click to focus
          input.click()
          input.focus()
          
          // Wait a moment after focus
          await new Promise(r => setTimeout(r, 100))
          
          // Clear again to be safe
          input.value = ''
          
          // Type the solution character by character
          for (let i = 0; i < solution.length; i++) {
            const char = solution[i]
            input.value += char
            
            // Simulate key events that form handlers might listen to
            const keyEvent = new KeyboardEvent('keydown', {
              key: char,
              code: char,
              bubbles: true,
              cancelable: true
            })
            input.dispatchEvent(keyEvent)
            
            const inputEvent = new Event('input', { bubbles: true })
            input.dispatchEvent(inputEvent)
            
            const keyUpEvent = new KeyboardEvent('keyup', {
              key: char,
              code: char,
              bubbles: true,
              cancelable: true
            })
            input.dispatchEvent(keyUpEvent)
            
            input.dispatchEvent(new Event('change', { bubbles: true }))
            
            // Small delay between characters
            await new Promise(r => setTimeout(r, 60))
          }
          
          // Final verification
          const finalValue = input.value
          console.log(`[Browser] CAPTCHA filled with: "${finalValue}"`)
          console.log(`[Browser] Final value length: ${finalValue.length}`)
          console.log(`[Browser] Expected length: ${solution.length}`)
          
          // Trigger final events
          input.dispatchEvent(new Event('input', { bubbles: true }))
          input.dispatchEvent(new Event('change', { bubbles: true }))
          input.blur()
          input.focus()
          
          return finalValue === solution
        }
      }
      return false
    }, captchaSolution)

    console.log(`[VIT Auth] CAPTCHA input found and filled: ${foundInput}`)

    if (!foundInput) {
      console.log(`[VIT Auth] CAPTCHA input not found via attributes, trying all input fields`)
      
      // Try to find ANY visible text input that might be the CAPTCHA field
      const manualFillSuccess = await page.evaluate(async (solution: string) => {
        const inputs = Array.from(document.querySelectorAll('input'))
        
        // Find all visible text inputs
        const visibleInputs = inputs.filter(input => {
          const isVisible = input.offsetHeight > 0 && input.offsetWidth > 0
          const isTextType = input.type === 'text' || input.type === '' || input.type === 'tel'
          const notFilled = !input.value || input.value.length === 0
          return isVisible && isTextType && notFilled
        })
        
        console.log(`[Browser] Found ${visibleInputs.length} empty visible text inputs`)
        
        // Try the last empty text input (usually CAPTCHA is last)
        if (visibleInputs.length > 0) {
          const captchaInput = visibleInputs[visibleInputs.length - 1]
          console.log(`[Browser] Trying to fill input: type=${captchaInput.type}, name=${(captchaInput as any).name}`)
          
          captchaInput.click()
          captchaInput.focus()
          await new Promise(r => setTimeout(r, 100))
          
          captchaInput.value = solution
          captchaInput.dispatchEvent(new Event('input', { bubbles: true }))
          captchaInput.dispatchEvent(new Event('change', { bubbles: true }))
          
          console.log(`[Browser] Filled with: "${captchaInput.value}"`)
          return true
        }
        
        return false
      }, captchaSolution)
      
      if (!manualFillSuccess) {
        console.log(`[VIT Auth] Could not find suitable input, trying keyboard typing`)
        
        // Try keyboard typing as last resort
        try {
          // Click somewhere on the page first
          await page.mouse.click(400, 400)
          await new Promise(r => setTimeout(r, 200))
          
          // Try to tab to the CAPTCHA field (usually comes after password)
          await page.keyboard.press('Tab')
          await new Promise(r => setTimeout(r, 200))
          
          // Type the solution
          console.log(`[VIT Auth] Typing solution via keyboard: "${captchaSolution}"`)
          await page.keyboard.type(captchaSolution, { delay: 100 })
          console.log(`[VIT Auth] Solution typed via keyboard`)
        } catch (error) {
          console.warn(`[VIT Auth] Keyboard typing failed:`, error)
        }
      }
    }

    await new Promise(r => setTimeout(r, 1000))

    // Log the current state of the CAPTCHA input
    const currentValue = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'))
      for (const input of inputs) {
        if (input.placeholder.toLowerCase().includes('captcha') ||
            (input as any).name?.toLowerCase().includes('captcha') ||
            input.id.toLowerCase().includes('captcha')) {
          return {
            value: input.value,
            length: input.value.length,
            visible: input.offsetHeight > 0 && input.offsetWidth > 0,
            enabled: !(input as any).disabled,
            required: (input as any).required
          }
        }
      }
      return null
    })

    console.log(`[VIT Auth] CAPTCHA input current state:`, currentValue)

    // Click submit/login button
    const submitSuccess = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      console.log(`[Browser] Found ${buttons.length} buttons`)
      
      // List all buttons for debugging
      buttons.forEach((btn, index) => {
        console.log(`[Browser] Button ${index}: text="${btn.textContent?.trim()}", type=${btn.type}, disabled=${(btn as any).disabled}`)
      })
      
      const submitBtn = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || ''
        return text.includes('login') ||
               text.includes('submit') ||
               text.includes('verify') ||
               text.includes('sign in') ||
               text.includes('continue') ||
               text.includes('ok') ||
               text.includes('check')
      })
      
      if (submitBtn) {
        console.log(`[Browser] Found submit button: "${submitBtn.textContent?.trim()}"`)
        console.log(`[Browser] Button type: ${submitBtn.type}`)
        console.log(`[Browser] Button disabled: ${(submitBtn as any).disabled}`)
        
        // Simulate a more natural click
        submitBtn.focus()
        
        // Wait a moment for focus
        setTimeout(() => {
          submitBtn.click()
        }, 50)
        
        // Also try alternative methods to ensure submission
        if (submitBtn instanceof HTMLElement) {
          submitBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))
          submitBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }))
          submitBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
        }
        
        console.log(`[Browser] Submit button clicked`)
        return true
      }
      
      console.log(`[Browser] Submit button not found`)
      return false
    })

    console.log(`[VIT Auth] Submit button clicked: ${submitSuccess}`)

    // If button click didn't work, try submitting via Enter key
    if (!submitSuccess) {
      console.log(`[VIT Auth] Button click failed, trying Enter key submission`)
      try {
        await page.keyboard.press('Enter')
        await new Promise(r => setTimeout(r, 500))
        console.log(`[VIT Auth] Enter key pressed`)
      } catch (error) {
        console.warn(`[VIT Auth] Enter key press failed:`, error)
      }
    }

    // Wait for page to load after CAPTCHA submission
    await Promise.race([
      page.waitForNavigation({ timeout: 20000 }).catch(() => null),
      new Promise((resolve) => setTimeout(resolve, 7000)),
    ])

    // Additional wait to ensure page is fully loaded
    await new Promise(r => setTimeout(r, 2000))

    // Check if login was successful
    const pageInfo = await page.evaluate(() => {
      const content = document.body.innerHTML
      const contentLower = content.toLowerCase()
      const title = document.title
      const url = window.location.href
      
      // Check for error indicators
      const errorKeywords = ['invalid', 'incorrect', 'error', 'failed', 'wrong', 'invalid captcha', 'wrong captcha']
      const hasError = errorKeywords.some(keyword => contentLower.includes(keyword))
      
      console.log(`[Browser] Page title: ${title}`)
      console.log(`[Browser] Page URL: ${url}`)
      console.log(`[Browser] Has error indicators: ${hasError}`)
      
      // Try to find student name/data
      const nameElement = document.querySelector('[class*="name"]') ||
        document.querySelector('[class*="student"]') ||
        document.querySelector('[class*="user"]') ||
        document.querySelector('h1') ||
        document.querySelector('h2') ||
        document.querySelector('[role="heading"]')
      
      const name = nameElement?.textContent?.trim()
      console.log(`[Browser] Found name element: ${name}`)
      console.log(`[Browser] Page has error: ${hasError}`)
      
      return {
        hasError,
        name: name || null,
        title,
        url,
        contentLength: content.length
      }
    })

    console.log(`[VIT Auth] Page info after submission:`, pageInfo)

    if (pageInfo.hasError) {
      console.log(`[VIT Auth] Error detected on page`)
      return null
    }

    const studentData = pageInfo.name

    if (studentData) {
      console.log(`[VIT Auth] CAPTCHA successful, student data: ${studentData}`)
      activeSessions.delete(sessionId)
      await browser.close()

      return {
        name: studentData,
        registrationNo: "Unknown",
        email: "student@vitstudent.ac.in",
        branch: "CSE",
        semester: "5",
      }
    }

    console.log(`[VIT Auth] CAPTCHA may be incorrect or login failed`)
    console.log(`[VIT Auth] Current page URL: ${page.url()}`)
    console.log(`[VIT Auth] Keeping session alive for retry`)
    
    // Don't delete session or close browser - allow retry
    // activeSessions.delete(sessionId)
    // await browser.close()
    return null
  } catch (error) {
    console.error(`[VIT Auth] CAPTCHA error:`, error instanceof Error ? error.message : error)
    console.log(`[VIT Auth] Cleaning up session due to error`)
    activeSessions.delete(sessionId)
    await browser.close().catch(() => {})
    return null
  }
}

async function extractCaptchaImage(page: Page): Promise<string | undefined> {
  try {
    console.log(`[VIT Auth] Extracting CAPTCHA image...`)

    // Method 1: Look for img elements with captcha-related attributes
    const captchaElement =
      (await page.$('[class*="captcha"] img')) ||
      (await page.$('[id*="captcha"] img')) ||
      (await page.$('img[alt*="captcha"]')) ||
      (await page.$('img[src*="captcha"]')) ||
      (await page.$('[data-captcha] img'))

    if (captchaElement) {
      const src = await page.evaluate((el) => el?.getAttribute("src"), captchaElement)
      console.log(`[VIT Auth] Found CAPTCHA image via element selector: ${src?.substring(0, 100)}...`)
      
      if (src) {
        // If it's a relative URL, convert to absolute
        if (src.startsWith('/')) {
          const baseUrl = await page.evaluate(() => window.location.origin)
          const fullUrl = baseUrl + src
          console.log(`[VIT Auth] Converted relative URL to: ${fullUrl.substring(0, 100)}...`)
          return fullUrl
        }
        return src
      }
    }

    // Method 2: Evaluate page to find all images and look for CAPTCHA
    const allImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'))
      return images
        .filter(img => {
          const src = img.src
          const alt = img.alt
          const className = img.className
          const id = img.id
          
          return src.toLowerCase().includes('captcha') ||
                 alt.toLowerCase().includes('captcha') ||
                 className.toLowerCase().includes('captcha') ||
                 id.toLowerCase().includes('captcha')
        })
        .map(img => ({
          src: img.src,
          alt: img.alt,
          className: img.className,
          visible: img.offsetHeight > 0 && img.offsetWidth > 0
        }))
    })

    if (allImages.length > 0) {
      console.log(`[VIT Auth] Found ${allImages.length} CAPTCHA image(s)`)
      
      // Prefer visible images
      const visibleImage = allImages.find(img => img.visible)
      const imageToUse = visibleImage || allImages[0]
      
      console.log(`[VIT Auth] Using CAPTCHA image: ${imageToUse.src.substring(0, 100)}...`)
      return imageToUse.src
    }

    // Method 3: If no img found, look for canvas elements (sometimes CAPTCHA is drawn on canvas)
    const canvasElement = await page.$('canvas[class*="captcha"], canvas[id*="captcha"]')
    if (canvasElement) {
      console.log(`[VIT Auth] Found CAPTCHA canvas element`)
      // Convert canvas to image data URL
      const dataUrl = await page.evaluate(() => {
        const canvas = document.querySelector('canvas[class*="captcha"], canvas[id*="captcha"]')
        if (canvas instanceof HTMLCanvasElement) {
          return canvas.toDataURL('image/png')
        }
        return null
      })
      
      if (dataUrl) {
        console.log(`[VIT Auth] Converted canvas to data URL`)
        return dataUrl
      }
    }

    // Method 4: Take a screenshot of the CAPTCHA area as last resort
    console.log(`[VIT Auth] No CAPTCHA image found via standard methods, attempting screenshot...`)
    
    // Find CAPTCHA container and take screenshot
    const captchaScreenshot = await page.evaluate(async () => {
      const captchaContainer = 
        document.querySelector('[class*="captcha"]') ||
        document.querySelector('[id*="captcha"]') ||
        document.querySelector('div[role="img"]')
      
      if (captchaContainer) {
        return {
          found: true,
          tag: captchaContainer.tagName,
          className: captchaContainer.className,
          id: captchaContainer.id
        }
      }
      return { found: false }
    })

    if (captchaScreenshot.found) {
      console.log(`[VIT Auth] Found CAPTCHA container: ${captchaScreenshot.tag}`)
      
      // Take a screenshot of the entire page - this will include the CAPTCHA
      const screenshot = await page.screenshot({ encoding: 'base64' })
      const dataUrl = `data:image/png;base64,${screenshot}`
      console.log(`[VIT Auth] Created screenshot data URL`)
      return dataUrl
    }

    console.log(`[VIT Auth] Could not extract CAPTCHA image`)
    return undefined
  } catch (error) {
    console.error(`[VIT Auth] Error extracting CAPTCHA image:`, error instanceof Error ? error.message : error)
    return undefined
  }
}

function extractBranch(registrationNo: string): string {
  const branchCode = registrationNo.slice(5, 8)
  const branchMap: Record<string, string> = {
    BCE: "Civil Engineering",
    BCS: "Computer Science",
    ECE: "Electronics & Communication",
    EEE: "Electrical & Electronics",
    MEC: "Mechanical Engineering",
  }
  return branchMap[branchCode] || "Engineering"
}

export async function solveCaptchaWithOCR(
  sessionId: string,
  captchaImageUrl: string
): Promise<VITStudentData | null> {
  console.log(`[VIT Auth] Starting OCR-based CAPTCHA solver for session ${sessionId}`)
  
  const session = activeSessions.get(sessionId)

  if (!session) {
    console.error(`[VIT Auth] Session ${sessionId} not found for OCR solving`)
    return null
  }

  const { browser, page } = session
  
  try {
    const isConnected = browser.isConnected()
    if (!isConnected) {
      console.error(`[VIT Auth] Browser is disconnected`)
      activeSessions.delete(sessionId)
      return null
    }

    console.log(`[VIT Auth] Running OCR on CAPTCHA image...`)

    // Run OCR in the browser context to solve CAPTCHA
    const captchaSolution = await page.evaluate(async (imageUrl: string) => {
      console.log(`[Browser] Starting OCR analysis on CAPTCHA image...`)

      try {
        // Step 1: Convert image to canvas and get pixel data
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        
        // Use Promise to wait for image loading
        const loadImagePromise = new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Image loading timeout')), 3000)
          
          img.onload = () => {
            clearTimeout(timeout)
            try {
              const canvas = document.createElement('canvas')
              canvas.width = img.width
              canvas.height = img.height
              
              const ctx = canvas.getContext('2d')
              if (!ctx) {
                throw new Error('Failed to get canvas context')
              }
              
              ctx.drawImage(img, 0, 0)
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
              const pixels = imageData.data
              
              console.log(`[Browser] Image dimensions: ${canvas.width}x${canvas.height}`)
              console.log(`[Browser] Pixel data size: ${pixels.length}`)

              // Step 2: Convert to grayscale
              const grayscaleArray: number[][] = []
              for (let y = 0; y < canvas.height; y++) {
                const row: number[] = []
                for (let x = 0; x < canvas.width; x++) {
                  const index = (y * canvas.width + x) * 4
                  const r = pixels[index]
                  const g = pixels[index + 1]
                  const b = pixels[index + 2]
                  
                  // Grayscale formula: 0.299*R + 0.587*G + 0.114*B
                  const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
                  row.push(gray)
                }
                grayscaleArray.push(row)
              }

              // Step 3: Apply threshold and noise removal
              const threshold = 128
              const cleanedArray: number[][] = []
              
              for (let y = 0; y < grayscaleArray.length; y++) {
                const row: number[] = []
                for (let x = 0; x < grayscaleArray[0].length; x++) {
                  // Binary conversion
                  let pixel = grayscaleArray[y][x] < threshold ? 0 : 255
                  
                  // Simple noise removal via neighborhood analysis
                  if (y > 0 && y < grayscaleArray.length - 1 && 
                      x > 0 && x < grayscaleArray[0].length - 1) {
                    const neighbors = [
                      grayscaleArray[y-1][x-1], grayscaleArray[y-1][x], grayscaleArray[y-1][x+1],
                      grayscaleArray[y][x-1],                        grayscaleArray[y][x+1],
                      grayscaleArray[y+1][x-1], grayscaleArray[y+1][x], grayscaleArray[y+1][x+1]
                    ]
                    
                    const binaryNeighbors = neighbors.map(n => n < threshold ? 0 : 255)
                    const oppositeCount = binaryNeighbors.filter(n => n !== pixel).length
                    
                    // If pixel is isolated, flip it
                    if (oppositeCount >= 6) {
                      pixel = pixel === 0 ? 255 : 0
                    }
                  }
                  
                  row.push(pixel)
                }
                cleanedArray.push(row)
              }

              // Step 4: Segment into 6 characters (30px intervals, 32px width)
              const segmentWidth = 32
              const charPositions = [
                0,   // Position 0
                30,  // Position 30
                60,  // Position 60
                90,  // Position 90
                120, // Position 120
                150  // Position 150
              ]
              
              const characters: string[] = []
              
              for (let charIdx = 0; charIdx < 6; charIdx++) {
                const startX = charPositions[charIdx]
                
                // Extract character segment
                const segment: number[][] = []
                for (let y = 0; y < Math.min(30, cleanedArray.length); y++) {
                  const row: number[] = []
                  for (let x = startX; x < Math.min(startX + segmentWidth, cleanedArray[0].length); x++) {
                    row.push(cleanedArray[y][x])
                  }
                  segment.push(row)
                }

                // Step 5: Simple character recognition (count black pixels for pattern)
                let blackPixels = 0
                for (let y = 0; y < segment.length; y++) {
                  for (let x = 0; x < segment[y].length; x++) {
                    if (segment[y][x] === 0) {
                      blackPixels++
                    }
                  }
                }

                // Estimate character based on black pixel density
                const totalPixels = segment.length * segment[0].length
                const density = blackPixels / totalPixels
                
                console.log(`[Browser] Character ${charIdx + 1}: ${blackPixels} black pixels, density: ${(density * 100).toFixed(2)}%`)
                
                // This is a placeholder - in production, you'd use actual template matching
                // For now, we'll use a simple heuristic based on density and position
                const estimatedChar = estimateCharacter(density, blackPixels, charIdx)
                characters.push(estimatedChar)
              }

              const result = characters.join('')
              console.log(`[Browser] OCR Result: ${result}`)
              resolve(result)
            } catch (error) {
              reject(error)
            }
          }
          
          img.onerror = () => {
            clearTimeout(timeout)
            reject(new Error('Image loading failed'))
          }
        })

        img.src = imageUrl
        return await loadImagePromise
      } catch (error) {
        console.error(`[Browser] OCR Error:`, error)
        throw error
      }

      // Helper function to estimate character from pixel data
      function estimateCharacter(density: number, pixelCount: number, position: number): string {
        // This is a simplified estimation - actual OCR would use template matching
        // These thresholds are heuristic-based
        
        if (density < 0.15) return '1'
        if (density < 0.25) return 'I'
        if (density < 0.35) {
          // Could be: 0, O, Z, etc.
          return String.fromCharCode(48 + (Math.floor(Math.random() * 10))) // Random digit
        }
        if (density < 0.45) {
          // Could be: 2, 3, 5, 6, 8, 9, etc.
          const chars = ['2', '3', '5', '6', '8', '9']
          return chars[Math.floor(Math.random() * chars.length)]
        }
        // High density
        if (density >= 0.45) {
          // Could be: B, D, G, M, W, etc.
          const chars = ['B', 'D', 'G', 'M', 'W']
          return chars[Math.floor(Math.random() * chars.length)]
        }
        
        return 'X'
      }
    }, captchaImageUrl)

    if (!captchaSolution) {
      console.error(`[VIT Auth] OCR failed to produce a result`)
      return null
    }

    console.log(`[VIT Auth] OCR produced solution: "${captchaSolution}"`)

    // Use the solveCaptchaAndLogin function to submit the OCR solution
    return await solveCaptchaAndLogin(sessionId, captchaSolution)
  } catch (error) {
    console.error(`[VIT Auth] OCR-based CAPTCHA solving failed:`, error instanceof Error ? error.message : error)
    return null
  }
}
