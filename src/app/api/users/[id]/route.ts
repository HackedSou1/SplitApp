import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, ApiError, hashPassword } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

// Admin only: update a member (rename, reset password, activate/deactivate, toggle admin)
export async function PATCH(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await request.json()

    const user = await db.user.findUnique({ where: { id } })
    if (!user) throw new ApiError("User not found", 404)

    const data: { name?: string; active?: boolean; isAdmin?: boolean; password?: string } = {}
    if (body?.name !== undefined) {
      const name = String(body.name).trim()
      if (!name) throw new ApiError("Name cannot be empty")
      data.name = name
    }
    if (body?.active !== undefined) {
      if (id === admin.id && body.active === false) {
        throw new ApiError("You cannot deactivate your own account")
      }
      data.active = Boolean(body.active)
    }
    if (body?.isAdmin !== undefined) {
      data.isAdmin = Boolean(body.isAdmin)
    }
    if (body?.password !== undefined) {
      const password = String(body.password)
      if (password.length < 6) throw new ApiError("Password must be at least 6 characters")
      data.password = hashPassword(password)
    }

    await db.user.update({ where: { id }, data })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error("update user error", e)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

// Admin only: delete a member and all their data
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    if (id === admin.id) throw new ApiError("You cannot delete your own account")

    const user = await db.user.findUnique({ where: { id } })
    if (!user) throw new ApiError("User not found", 404)
    if (user.isAdmin) {
      const adminCount = await db.user.count({ where: { isAdmin: true } })
      if (adminCount <= 1) throw new ApiError("Cannot delete the last admin")
    }

    await db.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error("delete user error", e)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
