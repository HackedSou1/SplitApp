import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser, ApiError } from "@/lib/auth"
import { ATTENDANCE_STATUSES } from "@/lib/constants"

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const meetingId = String(body?.meetingId ?? "")
    const status = String(body?.status ?? "")

    if (!ATTENDANCE_STATUSES.includes(status as never)) {
      throw new ApiError("Invalid attendance status")
    }
    const meeting = await db.meeting.findUnique({ where: { id: meetingId } })
    if (!meeting) throw new ApiError("Meeting not found", 404)
    if (meeting.status !== "scheduled") {
      throw new ApiError("This meeting already took place — attendance can no longer be changed")
    }

    const existing = await db.attendance.findUnique({
      where: { userId_meetingId: { userId: user.id, meetingId } },
    })
    if (existing) {
      if (existing.status === status) return NextResponse.json({ ok: true })
      await db.attendance.update({
        where: { userId_meetingId: { userId: user.id, meetingId } },
        data: { status },
      })
    } else {
      await db.attendance.create({ data: { userId: user.id, meetingId, status } })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error("attendance error", e)
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 })
  }
}
