import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { requireUser, ApiError } from "@/lib/auth"
import { ROLE_KEYS, isMultiRole, slotLabel } from "@/lib/constants"

type Tx = Prisma.TransactionClient

// Locks the meeting row so two people can't grab the same slot (or two slots) at the same moment.
async function lockMeeting(tx: Tx, meetingId: string) {
  await tx.$queryRaw`SELECT id FROM "Meeting" WHERE id = ${meetingId} FOR UPDATE`
  const meeting = await tx.meeting.findUnique({ where: { id: meetingId } })
  if (!meeting) throw new ApiError("Meeting not found", 404)
  return meeting
}

async function checkTarget(tx: Tx, meetingId: string, userId: string, isAdmin: boolean, force: boolean, ignoreId?: string) {
  const target = await tx.user.findUnique({ where: { id: userId } })
  if (!target || !target.active) throw new ApiError("Member not found or inactive", 404)
  const other = await tx.meetingRole.findFirst({
    where: { meetingId, userId, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
  })
  if (other && !(isAdmin && force)) {
    const what = slotLabel(other.role, other.slot)
    throw new ApiError(
      isAdmin
        ? `${target.name} already has a role (${what}).`
        : `You already have a role in this meeting (${what}). Withdraw from it first — one role per person.`,
      409
    )
  }
  return target
}

function handle(e: unknown, fallback: string) {
  if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    return NextResponse.json({ error: "Someone just took this role. The board has been refreshed." }, { status: 409 })
  }
  console.error(fallback, e)
  return NextResponse.json({ error: fallback }, { status: 500 })
}

// Take a role slot: members sign themselves up; admins can assign anyone.
export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const meetingId = String(body?.meetingId ?? "")
    const role = String(body?.role ?? "")
    const slot = isMultiRole(role) ? Number(body?.slot ?? 1) : 1
    const targetUserId = body?.userId ? String(body.userId) : user.id
    const force = Boolean(body?.force)

    if (!ROLE_KEYS.includes(role)) throw new ApiError("Invalid role")
    if (targetUserId !== user.id && !user.isAdmin) throw new ApiError("Only admins can assign roles to other members", 403)

    await db.$transaction(async (tx) => {
      const meeting = await lockMeeting(tx, meetingId)
      if (meeting.status !== "scheduled" && !user.isAdmin) throw new ApiError("Roles are locked once a meeting has taken place")
      if (!Number.isInteger(slot) || slot < 1 || slot > (isMultiRole(role) ? meeting.speakerSlots : 1)) {
        throw new ApiError("Invalid slot")
      }
      const holder = await tx.meetingRole.findUnique({
        where: { meetingId_role_slot: { meetingId, role, slot } },
        include: { user: { select: { name: true } } },
      })
      if (holder) {
        if (holder.userId === targetUserId) return
        throw new ApiError(`${slotLabel(role, slot)} is already taken by ${holder.user.name}.`, 409)
      }
      await checkTarget(tx, meetingId, targetUserId, user.isAdmin, force)
      await tx.meetingRole.create({ data: { meetingId, userId: targetUserId, role, slot } })
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return handle(e, "Failed to assign role")
  }
}

// Admin only: hand a filled slot to a different member.
export async function PATCH(request: Request) {
  try {
    const user = await requireUser()
    if (!user.isAdmin) throw new ApiError("Only admins can reassign roles", 403)
    const body = await request.json()
    const id = String(body?.id ?? "")
    const userId = String(body?.userId ?? "")
    const force = Boolean(body?.force)

    await db.$transaction(async (tx) => {
      const current = await tx.meetingRole.findUnique({ where: { id } })
      if (!current) throw new ApiError("Role assignment not found", 404)
      await lockMeeting(tx, current.meetingId)
      if (current.userId === userId) return
      await checkTarget(tx, current.meetingId, userId, true, force, id)
      await tx.meetingRole.update({ where: { id }, data: { userId } })
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return handle(e, "Failed to reassign role")
  }
}

// Free a slot: members can withdraw themselves; admins can remove anyone.
export async function DELETE(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const assignmentId = String(body?.id ?? "")
    const assignment = await db.meetingRole.findUnique({ where: { id: assignmentId }, include: { meeting: true } })
    if (!assignment) throw new ApiError("Role assignment not found", 404)
    if (assignment.userId !== user.id && !user.isAdmin) throw new ApiError("You can only withdraw your own roles", 403)
    if (assignment.meeting.status !== "scheduled" && !user.isAdmin) {
      throw new ApiError("Roles are locked once a meeting has taken place")
    }
    await db.meetingRole.delete({ where: { id: assignmentId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return handle(e, "Failed to remove role")
  }
}
