import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { requireUser, ApiError, verifyPassword, hashPassword, SESSION_COOKIE } from "@/lib/auth"

// Any signed-in member: change your own password (needs the current one).
export async function POST(request: Request) {
  try {
    const me = await requireUser()
    const body = await request.json()
    const current = String(body?.currentPassword ?? "")
    const next = String(body?.newPassword ?? "")

    const user = await db.user.findUnique({ where: { id: me.id } })
    if (!user || !verifyPassword(current, user.password)) throw new ApiError("Your current password is incorrect")
    if (next.length < 6) throw new ApiError("New password must be at least 6 characters")
    if (next === current) throw new ApiError("New password must be different from the current one")

    const token = (await cookies()).get(SESSION_COOKIE)?.value ?? ""
    await db.$transaction([
      db.user.update({ where: { id: me.id }, data: { password: hashPassword(next) } }),
      // sign out every other device that was logged in with the old password
      db.session.deleteMany({ where: { userId: me.id, id: { not: token } } }),
    ])
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error("change password error", e)
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
  }
}
