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

      // Store session for later CAPTCHA solving
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      activeSessions.set(sessionId, { browser, page })

      // Set timeout to clean up after 30 minutes
      setTimeout(() => {
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
  const session = activeSessions.get(sessionId)

  if (!session) {
    console.error(`[VIT Auth] Session ${sessionId} not found`)
    return null
  }

  const { browser, page } = session

  try {
    console.log(`[VIT Auth] Solving CAPTCHA for session ${sessionId}...`)

    // Find and fill CAPTCHA input field
    const captchaInputs = await page.evaluate(async (solution: string) => {
      const inputs = Array.from(document.querySelectorAll('input'))
      
      // Try to find CAPTCHA input by placeholder, name, or id
      for (const input of inputs) {
        if (input.placeholder.toLowerCase().includes('captcha') ||
            (input as any).name?.toLowerCase().includes('captcha') ||
            input.id.toLowerCase().includes('captcha') ||
            input.className.toLowerCase().includes('captcha')) {
          input.click()
          input.value = solution
          input.dispatchEvent(new Event('input', { bubbles: true }))
          input.dispatchEvent(new Event('change', { bubbles: true }))
          return true
        }
      }
      return false
    }, captchaSolution)

    if (!captchaInputs) {
      console.log(`[VIT Auth] CAPTCHA input not found, trying manual type`)
      // Try typing if click didn't work
      const captchaInput = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'))
        for (const input of inputs) {
          if (input.placeholder.toLowerCase().includes('captcha') ||
              (input as any).name?.toLowerCase().includes('captcha') ||
              input.id.toLowerCase().includes('captcha')) {
            return true
          }
        }
        return false
      })

      if (captchaInput) {
        await page.keyboard.type(captchaSolution, { delay: 50 })
      }
    }

    await new Promise(r => setTimeout(r, 500))

    // Click submit/login button
    const submitSuccess = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const submitBtn = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('login') ||
        btn.textContent?.toLowerCase().includes('submit') ||
        btn.textContent?.toLowerCase().includes('verify')
      )
      if (submitBtn) {
        (submitBtn as HTMLElement).click()
        return true
      }
      return false
    })

    console.log(`[VIT Auth] Submit clicked: ${submitSuccess}`)

    // Wait for page to load after CAPTCHA submission
    await Promise.race([
      page.waitForNavigation({ timeout: 10000 }).catch(() => null),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ])

    // Check if login was successful
    const studentData = await page.evaluate(() => {
      const content = document.body.innerHTML.toLowerCase()
      const hasError = content.includes('invalid') || 
                       content.includes('incorrect') ||
                       content.includes('error')
      
      if (hasError) return null

      const nameElement = document.querySelector('[class*="name"]') ||
        document.querySelector('[class*="student"]') ||
        document.querySelector('h1') ||
        document.querySelector('h2')
      
      return nameElement?.textContent?.trim() || null
    })

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
    activeSessions.delete(sessionId)
    await browser.close()
    return null
  } catch (error) {
    console.error(`[VIT Auth] CAPTCHA error:`, error instanceof Error ? error.message : error)
    activeSessions.delete(sessionId)
    await browser.close().catch(() => {})
    return null
  }
}

async function extractCaptchaImage(page: Page): Promise<string | undefined> {
  try {
    const captchaElement =
      (await page.$('[class*="captcha"] img')) ||
      (await page.$('[id*="captcha"] img')) ||
      (await page.$('img[alt*="captcha"]'))

    if (captchaElement) {
      const src = await page.evaluate((el) => el?.getAttribute("src"), captchaElement)
      return src || undefined
    }
  } catch {
    // Silently fail
  }
  return undefined
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
