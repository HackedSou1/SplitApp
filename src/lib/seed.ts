import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth"

// Creates the first admin account on a brand-new database. No sample data.
export async function ensureSeeded(): Promise<void> {
  const count = await db.user.count()
  if (count > 0) return
  await db.user.create({
    data: {
      email: "admin@club.com",
      name: "Club Admin",
      password: hashPassword("admin123"),
      isAdmin: true,
    },
  })
}
