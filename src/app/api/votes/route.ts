import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser, ApiError } from "@/lib/auth"
import { VOTE_CATEGORY_KEYS } from "@/lib/constants"

// Cast or change a vote. candidateId: null clears the vote.
export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const meetingId = String(body?.meetingId ?? "")
    const category = String(body?.category ?? "")
    const candidateId = body?.candidateId ? String(body.candidateId) : null

    if (!VOTE_CATEGORY_KEYS.includes(category)) throw new ApiError("Invalid vote category")

    const meeting = await db.meeting.findUnique({ where: { id: meetingId } })
    if (!meeting) throw new ApiError("Meeting not found", 404)
    if (meeting.status !== "completed") {
      throw new ApiError(
        meeting.status === "scheduled"
          ? "Voting is not open yet — the meeting hasn't taken place"
          : "Voting has been closed for this meeting"
      )
    }

    const key = { meetingId_voterId_category: { meetingId, voterId: user.id, category } }

    if (!candidateId) {
      await db.vote.deleteMany({ where: { meetingId, voterId: user.id, category } })
      return NextResponse.json({ ok: true })
    }

    if (candidateId === user.id) {
      throw new ApiError("You cannot vote for yourself")
    }
    const nominees = (meeting.nominations as Record<string, string[]> | null)?.[category]
    if (nominees && nominees.length > 0 && !nominees.includes(candidateId)) {
      throw new ApiError("This member is not nominated for this award")
    }
    const candidate = await db.user.findUnique({ where: { id: candidateId } })
    if (!candidate || !candidate.active) throw new ApiError("Candidate not found or inactive", 404)

    const existing = await db.vote.findUnique({ where: { ...key } })
    if (existing) {
      if (existing.candidateId === candidateId) return NextResponse.json({ ok: true })
      await db.vote.update({ where: { ...key }, data: { candidateId } })
    } else {
      await db.vote.create({ data: { meetingId, voterId: user.id, category, candidateId } })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error("vote error", e)
    return NextResponse.json({ error: "Failed to save vote" }, { status: 500 })
  }
}
