import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, ApiError, hashPassword } from "@/lib/auth"

// Admin only: add a new member
export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const name = String(body?.name ?? "").trim()
    const email = String(body?.email ?? "").trim().toLowerCase()
    const password = String(body?.password ?? "")
    const isAdmin = Boolean(body?.isAdmin)

    if (!name) throw new ApiError("Name is required")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError("A valid email is required")
    if (password.length < 6) throw new ApiError("Password must be at least 6 characters")

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) throw new ApiError("A user with this email already exists")

    const user = await db.user.create({
      data: { name, email, password: hashPassword(password), isAdmin },
    })
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin },
    })
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error("create user error", e)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
