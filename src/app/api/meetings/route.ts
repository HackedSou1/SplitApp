import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, ApiError } from "@/lib/auth"

// Admin only: create a meeting
export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const title = String(body?.title ?? "").trim()
    const theme = body?.theme ? String(body.theme).trim() : null
    const dateStr = String(body?.date ?? "")

    if (!title) throw new ApiError("Title is required")
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) throw new ApiError("A valid date is required")

    const meeting = await db.meeting.create({ data: { title, theme, date } })
    return NextResponse.json({ meeting: { id: meeting.id } })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error("create meeting error", e)
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 })
  }
}
