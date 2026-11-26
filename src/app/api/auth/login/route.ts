import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createSession, verifyPassword } from "@/lib/auth"
import { ensureSeeded } from "@/lib/seed"

export async function POST(request: Request) {
  try {
    await ensureSeeded()
    const body = await request.json()
    const email = String(body?.email ?? "").trim().toLowerCase()
    const password = String(body?.password ?? "")
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }
    const user = await db.user.findUnique({ where: { email } })
    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }
    if (!user.active) {
      return NextResponse.json({ error: "This account has been deactivated. Contact your club admin." }, { status: 403 })
    }
    await createSession(user.id)
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin },
    })
  } catch (e) {
    console.error("login error", e)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
