import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, ApiError } from "@/lib/auth"
import { MEETING_STATUSES } from "@/lib/constants"

type Params = { params: Promise<{ id: string }> }

// Admin only: update a meeting (details or status transitions)
export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()

    const meeting = await db.meeting.findUnique({ where: { id } })
    if (!meeting) throw new ApiError("Meeting not found", 404)

    const data: { title?: string; theme?: string | null; date?: Date; status?: string } = {}
    if (body?.title !== undefined) {
      const title = String(body.title).trim()
      if (!title) throw new ApiError("Title cannot be empty")
      data.title = title
    }
    if (body?.theme !== undefined) {
      data.theme = body.theme ? String(body.theme).trim() : null
    }
    if (body?.date !== undefined) {
      const date = new Date(String(body.date))
      if (isNaN(date.getTime())) throw new ApiError("Invalid date")
      data.date = date
    }
    if (body?.status !== undefined) {
      const status = String(body.status)
      if (!MEETING_STATUSES.includes(status as never)) throw new ApiError("Invalid status")
      data.status = status
    }

    await db.meeting.update({ where: { id }, data })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error("update meeting error", e)
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 })
  }
}

// Admin only: delete a meeting
export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin()
    const { id } = await params
    const meeting = await db.meeting.findUnique({ where: { id } })
    if (!meeting) throw new ApiError("Meeting not found", 404)
    await db.meeting.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error("delete meeting error", e)
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 })
  }
}
