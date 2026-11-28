// Bulk-add members from a CSV (name,email,password). Existing emails are skipped.
// Usage: DATABASE_URL=... npx tsx scripts/add-members.ts path/to/members.csv
import { readFileSync } from "fs"
import { PrismaClient } from "@prisma/client"
import { hashPassword } from "../src/lib/auth"

const db = new PrismaClient()

async function main() {
  const file = process.argv[2]
  if (!file) throw new Error("Pass the CSV path: npx tsx scripts/add-members.ts members.csv")
  const rows = readFileSync(file, "utf8").trim().split(/\r?\n/).slice(1)
  let added = 0
  for (const line of rows) {
    const [name, email, password] = line.split(",").map((s) => s.trim())
    if (!name || !email || !password) continue
    const exists = await db.user.findUnique({ where: { email: email.toLowerCase() } })
    if (exists) {
      console.log(`skip (exists): ${email}`)
      continue
    }
    await db.user.create({
      data: { name, email: email.toLowerCase(), password: hashPassword(password), isAdmin: false },
    })
    added++
    console.log(`added: ${email}`)
  }
  console.log(`Done. ${added} added.`)
}

main().finally(() => db.$disconnect())
