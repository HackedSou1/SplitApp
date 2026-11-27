import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, ApiError } from "@/lib/auth"
import { parseMeetingFields } from "@/lib/meeting-input"

// Admin only: create a meeting
export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const fields = parseMeetingFields(body ?? {})
    if (!fields.title) throw new ApiError("Title is required")
    if (!fields.date) throw new ApiError("A valid date is required")
    const meeting = await db.meeting.create({ data: { ...fields, title: fields.title, date: fields.date } })
    return NextResponse.json({ meeting: { id: meeting.id } })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error("create meeting error", e)
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 })
  }
}
