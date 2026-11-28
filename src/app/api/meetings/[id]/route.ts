import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, ApiError } from "@/lib/auth"
import { MEETING_STATUSES, VOTE_CATEGORY_KEYS } from "@/lib/constants"
import { parseMeetingFields } from "@/lib/meeting-input"

type Params = { params: Promise<{ id: string }> }

// Admin only: update a meeting (details or status transitions)
export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()

    const meeting = await db.meeting.findUnique({ where: { id } })
    if (!meeting) throw new ApiError("Meeting not found", 404)

    const data: ReturnType<typeof parseMeetingFields> & { status?: string; nominations?: Record<string, string[]> } =
      parseMeetingFields(body ?? {})
    if (body?.nominations !== undefined) {
      const raw = body.nominations as Record<string, unknown>
      if (!raw || typeof raw !== "object") throw new ApiError("Invalid nominations")
      const nominations: Record<string, string[]> = {}
      for (const key of VOTE_CATEGORY_KEYS) {
        const ids = Array.isArray(raw[key]) ? Array.from(new Set((raw[key] as unknown[]).map(String))) : []
        if (ids.length > 0) nominations[key] = ids
      }
      const all = Array.from(new Set(Object.values(nominations).flat()))
      const found = await db.user.count({ where: { id: { in: all } } })
      if (found !== all.length) throw new ApiError("Some nominees were not found")
      data.nominations = nominations
    }
    if (data.speakerSlots !== undefined && data.speakerSlots < meeting.speakerSlots) {
      const taken = await db.meetingRole.count({
        where: { meetingId: id, role: { in: ["speaker", "evaluator"] }, slot: { gt: data.speakerSlots } },
      })
      if (taken > 0) throw new ApiError("Some of the speaker/evaluator slots you are removing are filled — free them first")
    }
    if (body?.status !== undefined) {
      const status = String(body.status)
      if (!MEETING_STATUSES.includes(status as never)) throw new ApiError("Invalid status")
      data.status = status
    }

    await db.meeting.update({ where: { id }, data })
    if (data.nominations) {
      // drop votes for anyone who was taken off an award's nominee list
      for (const [category, ids] of Object.entries(data.nominations)) {
        await db.vote.deleteMany({ where: { meetingId: id, category, candidateId: { notIn: ids } } })
      }
    }
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
