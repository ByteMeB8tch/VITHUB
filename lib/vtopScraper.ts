// lib/vtopScraper.ts - Puppeteer-based VTOP scraper with anti-bot measures
import puppeteer, { Browser, Page } from 'puppeteer'

export interface VTOPGrade {
  courseCode: string
  courseName: string
  faculty: string
  grade: string
  credits: number
  points: number
}

export interface VTOPAttendance {
  courseCode: string
  courseName: string
  present: number
  total: number
  percentage: number
}

export interface VTOPStudentData {
  registrationNo: string
  name: string
  email: string
  branch: string
  semester: string
  cgpa: number
  credits: number
  grades: VTOPGrade[]
  attendance: VTOPAttendance[]
  profilePhoto?: string
}

/**
 * Sleep for a random duration (anti-bot measure)
 */
async function randomDelay(min: number = 500, max: number = 2000) {
  const delay = Math.random() * (max - min) + min
  await new Promise(resolve => setTimeout(resolve, delay))
}

/**
 * Random click position to avoid bot detection
 */
async function clickElementRandomly(page: Page, selector: string) {
  const element = await page.$(selector)
  if (!element) throw new Error(`Element not found: ${selector}`)

  const boundingBox = await element.boundingBox()
  if (!boundingBox) throw new Error(`Element not visible: ${selector}`)

  const randomX = boundingBox.x + Math.random() * boundingBox.width
  const randomY = boundingBox.y + Math.random() * boundingBox.height

  await page.mouse.click(randomX, randomY)
  await randomDelay()
}

/**
 * Type text with random delays between characters (avoid bot detection)
 */
async function typeWithRandomDelay(page: Page, selector: string, text: string) {
  const element = await page.$(selector)
  if (!element) throw new Error(`Element not found: ${selector}`)

  await element.click()
  await randomDelay(200, 500)

  for (const char of text) {
    await page.type(selector, char)
    await randomDelay(50, 150)
  }
}

/**
 * Extract grades from VTOP
 */
async function extractGrades(page: Page): Promise<VTOPGrade[]> {
  const grades = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr')
    const results: VTOPGrade[] = []

    rows.forEach(row => {
      const cells = row.querySelectorAll('td')
      if (cells.length >= 6) {
        results.push({
          courseCode: cells[0]?.textContent?.trim() || '',
          courseName: cells[1]?.textContent?.trim() || '',
          faculty: cells[2]?.textContent?.trim() || '',
          grade: cells[3]?.textContent?.trim() || '',
          credits: parseFloat(cells[4]?.textContent?.trim() || '0'),
          points: parseFloat(cells[5]?.textContent?.trim() || '0'),
        })
      }
    })

    return results
  })

  return grades
}

/**
 * Extract attendance from VTOP
 */
async function extractAttendance(page: Page): Promise<VTOPAttendance[]> {
  const attendance = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr')
    const results: VTOPAttendance[] = []

    rows.forEach(row => {
      const cells = row.querySelectorAll('td')
      if (cells.length >= 5) {
        const present = parseInt(cells[2]?.textContent?.trim() || '0')
        const total = parseInt(cells[3]?.textContent?.trim() || '1')
        const percentage = total > 0 ? (present / total) * 100 : 0

        results.push({
          courseCode: cells[0]?.textContent?.trim() || '',
          courseName: cells[1]?.textContent?.trim() || '',
          present,
          total,
          percentage,
        })
      }
    })

    return results
  })

  return attendance
}

/**
 * Extract student profile information
 */
async function extractProfileInfo(page: Page) {
  const profileInfo = await page.evaluate(() => {
    return {
      name: document.querySelector('[data-label="Name"]')?.textContent?.trim() || '',
      registrationNo: document.querySelector('[data-label="RegNo"]')?.textContent?.trim() || '',
      email: document.querySelector('[data-label="Email"]')?.textContent?.trim() || '',
      branch: document.querySelector('[data-label="Branch"]')?.textContent?.trim() || '',
      semester: document.querySelector('[data-label="Semester"]')?.textContent?.trim() || '',
      cgpa: parseFloat(
        document.querySelector('[data-label="CGPA"]')?.textContent?.trim() || '0'
      ),
      credits: parseInt(
        document.querySelector('[data-label="Credits"]')?.textContent?.trim() || '0'
      ),
    }
  })

  return profileInfo
}

/**
 * Handle navigation with retries
 */
async function navigateWithRetry(
  page: Page,
  url: string,
  maxRetries: number = 3
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
      return
    } catch (error) {
      if (i < maxRetries - 1) {
        console.log(`Navigation retry ${i + 1}/${maxRetries} for ${url}`)
        await randomDelay(1000, 3000)
      } else {
        throw error
      }
    }
  }
}

/**
 * Main VTOP scraping function
 * Note: This assumes the user is already logged in (browser context with cookies)
 */
export async function scrapeVTOPData(
  sessionCookies: Array<{ name: string; value: string; domain: string; path: string }>,
  registrationNo: string,
  timeout: number = 120000 // 2 minutes
): Promise<VTOPStudentData> {
  let browser: Browser | null = null
  let page: Page | null = null

  try {
    console.log(`[VTOP-SCRAPER] Starting scrape for ${registrationNo}`)

    // Launch Puppeteer with anti-detection measures
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--start-maximized',
      ],
    })

    page = await browser.newPage()

    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    // Add cookies
    await page.setCookie(...sessionCookies)

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 })

    // Navigate to VTOP dashboard
    const vtopUrl = process.env.VTOP_BASE_URL || 'https://vtop.vit.ac.in'
    await navigateWithRetry(page, `${vtopUrl}/academic/common/StudentDashboard`)

    await randomDelay(1000, 2000)

    // Extract profile info
    const profileInfo = await extractProfileInfo(page)

    // Navigate to grades page
    await navigateWithRetry(page, `${vtopUrl}/academic/common/Viewgrades`)
    await randomDelay(1000, 2000)

    // Handle pagination for grades
    const grades: VTOPGrade[] = []
    let pageNum = 1
    const maxPages = 5 // Prevent infinite loops

    while (pageNum <= maxPages) {
      try {
        const pageGrades = await extractGrades(page)
        grades.push(...pageGrades)

        // Try to navigate to next page
        const nextButton = await page.$('a.next')
        if (!nextButton) break

        await clickElementRandomly(page, 'a.next')
        await randomDelay(1500, 3000)
        pageNum++
      } catch (error) {
        console.log(`[VTOP-SCRAPER] No more pages for grades at page ${pageNum}`)
        break
      }
    }

    // Navigate to attendance page
    await navigateWithRetry(page, `${vtopUrl}/academic/common/StudentAttendance`)
    await randomDelay(1000, 2000)

    // Extract attendance
    const attendance = await extractAttendance(page)

    // Compile all data
    const vtopData: VTOPStudentData = {
      registrationNo: profileInfo.registrationNo || registrationNo,
      name: profileInfo.name,
      email: profileInfo.email,
      branch: profileInfo.branch,
      semester: profileInfo.semester,
      cgpa: profileInfo.cgpa,
      credits: profileInfo.credits,
      grades,
      attendance,
    }

    console.log(`[VTOP-SCRAPER] Successfully scraped data for ${registrationNo}`)
    return vtopData
  } catch (error) {
    console.error(`[VTOP-SCRAPER] Error scraping VTOP for ${registrationNo}:`, error)
    throw new Error(`Failed to scrape VTOP data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    if (page) await page.close()
    if (browser) await browser.close()
  }
}

/**
 * Export scraper for testing
 */
export { randomDelay, clickElementRandomly, typeWithRandomDelay }
