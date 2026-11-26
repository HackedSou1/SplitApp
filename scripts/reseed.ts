import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  // wipe everything so ensureSeeded() rebuilds demo data on next request
  await db.vote.deleteMany()
  await db.meetingRole.deleteMany()
  await db.attendance.deleteMany()
  await db.session.deleteMany()
  await db.meeting.deleteMany()
  await db.user.deleteMany()
  console.log('database emptied - demo data will re-seed on next request')
}
main().finally(() => db.$disconnect())
