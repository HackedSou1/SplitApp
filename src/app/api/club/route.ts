import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, ApiError } from "@/lib/auth"
import { getClub } from "@/lib/club"

const opt = (v: unknown) => (v === undefined ? undefined : String(v ?? "").trim() || null)

// Admin only: update club-wide settings (name, default venue, links)
export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    await getClub()
    const body = await request.json()
    const name = body?.name === undefined ? undefined : String(body.name).trim()
    if (name === "") throw new ApiError("Club name cannot be empty")
    const meetingTime = body?.meetingTime === undefined ? undefined : String(body.meetingTime)
    if (meetingTime !== undefined && !/^\d{2}:\d{2}$/.test(meetingTime)) throw new ApiError("Invalid time")
    for (const k of ["mapsUrl", "scriptUrl", "guideUrl"]) {
      const v = opt(body?.[k])
      if (v && !/^https?:\/\//i.test(v)) throw new ApiError("Links must start with http:// or https://")
    }
    await db.club.update({
      where: { id: 1 },
      data: {
        name,
        meetingTime,
        venue: opt(body?.venue),
        mapsUrl: opt(body?.mapsUrl),
        scriptUrl: opt(body?.scriptUrl),
        guideUrl: opt(body?.guideUrl),
      },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error("club update error", e)
    return NextResponse.json({ error: "Failed to save club settings" }, { status: 500 })
  }
}
