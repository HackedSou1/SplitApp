import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const users = await db.user.count()
  const meetings = await db.meeting.count()
  const votes = await db.vote.count()
  const roles = await db.meetingRole.count()
  const attendance = await db.attendance.count()
  console.log(JSON.stringify({ users, meetings, votes, roles, attendance }))
  const m = await db.meeting.findMany({ select: { title: true, status: true, date: true } })
  console.log(m.map(x => `${x.status} | ${x.date.toISOString().slice(0,10)} | ${x.title}`).join('\n'))
}
main().finally(() => db.$disconnect())
