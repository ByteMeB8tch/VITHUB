import puppeteer from "puppeteer"

export interface VITStudentData {
  name: string
  registrationNo: string
  email: string
  branch: string
  semester: string
  section?: string
}

export async function authenticateVITPortal(
  registrationNo: string,
  password: string
): Promise<VITStudentData | null> {
  let browser
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    const page = await browser.newPage()

    // Set timeout
    page.setDefaultTimeout(30000)

    console.log(`[VIT Auth] Attempting login for ${registrationNo}...`)

    // Navigate to VIT portal
    await page.goto("https://vitcc.ac.in", { waitUntil: "networkidle2" })

    // Wait for registration number input
    await page.waitForSelector('input[name="username"]', { timeout: 10000 })

    // Fill in credentials
    await page.type('input[name="username"]', registrationNo)
    await page.type('input[name="password"]', password)

    // Click login button
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2" }),
      page.click('button[type="submit"]'),
    ])

    console.log(`[VIT Auth] Login successful for ${registrationNo}`)

    // Wait for dashboard to load
    await page.waitForSelector(".student-info, .profile-info, [data-student-name]", {
      timeout: 10000,
    })

    // Extract student data
    const studentData = await page.evaluate(() => {
      // Try multiple selectors for robustness
      const nameElement =
        document.querySelector(".student-name")?.textContent ||
        document.querySelector(".profile-name")?.textContent ||
        document.querySelector("[data-student-name]")?.textContent ||
        ""

      const regNoElement =
        document.querySelector(".registration-no")?.textContent ||
        document.querySelector(".reg-no")?.textContent ||
        document.querySelector("[data-reg-no]")?.textContent ||
        ""

      const emailElement =
        document.querySelector(".email")?.textContent ||
        document.querySelector("[data-email]")?.textContent ||
        ""

      const branchElement =
        document.querySelector(".branch")?.textContent ||
        document.querySelector("[data-branch]")?.textContent ||
        ""

      const semesterElement =
        document.querySelector(".semester")?.textContent ||
        document.querySelector("[data-semester]")?.textContent ||
        ""

      return {
        name: nameElement.trim(),
        registrationNo: regNoElement.trim(),
        email: emailElement.trim(),
        branch: branchElement.trim(),
        semester: semesterElement.trim(),
      }
    })

    console.log("[VIT Auth] Extracted student data:", studentData)

    // Validate extracted data
    if (!studentData.name || !studentData.registrationNo) {
      console.error("[VIT Auth] Failed to extract student data")
      return null
    }

    // Parse branch and section
    const branchMatch = studentData.branch.match(/([A-Z]+)/)
    const sectionMatch = studentData.branch.match(/([A-Z]\d)/)

    return {
      name: studentData.name,
      registrationNo: studentData.registrationNo,
      email: studentData.email || `${studentData.registrationNo}@vitstudent.ac.in`,
      branch: branchMatch ? branchMatch[1] : "CSE",
      semester: studentData.semester || "3",
      section: sectionMatch ? sectionMatch[1] : undefined,
    }
  } catch (error) {
    console.error("[VIT Auth] Error authenticating with VIT portal:", error)
    return null
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// Mock function for testing (in case VIT portal is down)
export function getMockVITData(registrationNo: string): VITStudentData {
  return {
    name: "Sample Student",
    registrationNo,
    email: `${registrationNo}@vitstudent.ac.in`,
    branch: "CSE",
    semester: "3",
    section: "B2",
  }
}
