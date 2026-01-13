import { NextRequest, NextResponse } from "next/server"
import { fetchStudentData } from "@/lib/vitAuth"

export async function POST(request: NextRequest) {
  try {
    const { dataSessionId, dataType } = await request.json()

    // Validate input
    if (!dataSessionId || !dataType) {
      return NextResponse.json(
        { error: "Data session ID and data type are required" },
        { status: 400 }
      )
    }

    // Validate dataType
    const validTypes = ['attendance', 'marks', 'timetable', 'profile']
    if (!validTypes.includes(dataType)) {
      return NextResponse.json(
        { error: "Invalid data type. Must be: attendance, marks, timetable, or profile" },
        { status: 400 }
      )
    }

    console.log(`[API] Fetching ${dataType} for session: ${dataSessionId}`)

    // Fetch student data from VTOP
    const data = await fetchStudentData(dataSessionId, dataType as any)

    if (!data) {
      return NextResponse.json(
        {
          error: `Failed to fetch ${dataType}. Session may have expired.`,
          details: "Please log in again.",
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      dataType,
      data,
    })
  } catch (error) {
    console.error("[API] Student data fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch student data. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
