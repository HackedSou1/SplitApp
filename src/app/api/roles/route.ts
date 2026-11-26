import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser, ApiError } from "@/lib/auth"
import { ROLE_KEYS, isMultiRole } from "@/lib/constants"

// Assign a role: members volunteer themselves; admins can assign anyone.
export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const meetingId = String(body?.meetingId ?? "")
    const role = String(body?.role ?? "")
    const targetUserId = body?.userId ? String(body.userId) : user.id

    if (!ROLE_KEYS.includes(role)) throw new ApiError("Invalid role")
    if (targetUserId !== user.id && !user.isAdmin) {
      throw new ApiError("Only admins can assign roles to other members", 403)
    }

    const meeting = await db.meeting.findUnique({ where: { id: meetingId } })
    if (!meeting) throw new ApiError("Meeting not found", 404)
    if (meeting.status !== "scheduled") {
      throw new ApiError("Roles are locked once a meeting has taken place")
    }

    const target = await db.user.findUnique({ where: { id: targetUserId } })
    if (!target || !target.active) throw new ApiError("Member not found or inactive", 404)

    const existing = await db.meetingRole.findUnique({
      where: { meetingId_userId_role: { meetingId, userId: targetUserId, role } },
    })
    if (existing) return NextResponse.json({ ok: true })

    if (!isMultiRole(role)) {
      const taken = await db.meetingRole.findFirst({ where: { meetingId, role } })
      if (taken) throw new ApiError("This role is already taken for the meeting")
    }

    await db.meetingRole.create({ data: { meetingId, userId: targetUserId, role } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error("role assign error", e)
    return NextResponse.json({ error: "Failed to assign role" }, { status: 500 })
  }
}

// Remove a role assignment: members can withdraw themselves; admins can remove anyone.
export async function DELETE(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const assignmentId = String(body?.id ?? "")
    const assignment = await db.meetingRole.findUnique({ where: { id: assignmentId } })
    if (!assignment) throw new ApiError("Role assignment not found", 404)

    if (assignment.userId !== user.id && !user.isAdmin) {
      throw new ApiError("You can only withdraw your own roles", 403)
    }
    const meeting = await db.meeting.findUnique({ where: { id: assignment.meetingId } })
    if (!meeting) throw new ApiError("Meeting not found", 404)
    if (meeting.status !== "scheduled" && !user.isAdmin) {
      throw new ApiError("Roles are locked once a meeting has taken place")
    }

    await db.meetingRole.delete({ where: { id: assignmentId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error("role delete error", e)
    return NextResponse.json({ error: "Failed to remove role" }, { status: 500 })
  }
}
