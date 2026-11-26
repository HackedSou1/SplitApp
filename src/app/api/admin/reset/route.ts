import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"

// Admin only: wipe all club data (members, meetings, votes, roles, attendance),
// keeping only the current admin account.
export async function POST() {
  try {
    const admin = await requireAdmin()
    await db.$transaction([
      db.vote.deleteMany(),
      db.meetingRole.deleteMany(),
      db.attendance.deleteMany(),
      db.session.deleteMany(),
      db.meeting.deleteMany(),
      db.user.deleteMany({ where: { id: { not: admin.id } } }),
    ])
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("reset error", e)
    return NextResponse.json({ error: "Failed to reset data" }, { status: 500 })
  }
}
