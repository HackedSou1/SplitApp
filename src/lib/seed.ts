import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth"

// Ensures the admin account (and initial demo data) exists.
// Safe to call on every request - it exits immediately if users already exist.
export async function ensureSeeded(): Promise<void> {
  const count = await db.user.count()
  if (count > 0) return

  const admin = await db.user.create({
    data: {
      email: "admin@club.com",
      name: "Club Admin",
      password: hashPassword("admin123"),
      isAdmin: true,
    },
  })

  const memberNames: [string, string][] = [
    ["Sarah Chen", "sarah@club.com"],
    ["James Rodriguez", "james@club.com"],
    ["Priya Sharma", "priya@club.com"],
    ["Michael Okafor", "michael@club.com"],
    ["Emily Watson", "emily@club.com"],
    ["David Kim", "david@club.com"],
    ["Aisha Patel", "aisha@club.com"],
    ["Tom Nguyen", "tom@club.com"],
  ]

  const members = await Promise.all(
    memberNames.map(([name, email]) =>
      db.user.create({
        data: { name, email, password: hashPassword("demo123") },
      })
    )
  )
  const [sarah, james, priya, michael, emily, david, aisha, tom] = members

  const day = (d: number) => {
    const dt = new Date()
    dt.setDate(dt.getDate() + d)
    dt.setHours(18, 30, 0, 0)
    return dt
  }

  // ---- Past meeting 1 (voting closed) ----
  const m1 = await db.meeting.create({
    data: {
      title: "Meeting #12 — The Power of Storytelling",
      theme: "Stories that move us",
      date: day(-28),
      status: "closed",
    },
  })
  await db.attendance.createMany({
    data: members.map((u) => ({ userId: u.id, meetingId: m1.id, status: "yes" })),
  })
  await db.meetingRole.createMany({
    data: [
      { meetingId: m1.id, userId: sarah.id, role: "toastmaster" },
      { meetingId: m1.id, userId: james.id, role: "speaker" },
      { meetingId: m1.id, userId: emily.id, role: "speaker" },
      { meetingId: m1.id, userId: priya.id, role: "evaluator" },
      { meetingId: m1.id, userId: michael.id, role: "evaluator" },
      { meetingId: m1.id, userId: david.id, role: "topicsmaster" },
      { meetingId: m1.id, userId: aisha.id, role: "grammarian" },
      { meetingId: m1.id, userId: tom.id, role: "ah_counter" },
      { meetingId: m1.id, userId: admin.id, role: "timer" },
    ],
  })
  // Final votes for meeting 1 (closed)
  const votes1: { meetingId: string; voterId: string; category: string; candidateId: string }[] = []
  const cast1 = (voter: string, cat: string, cand: string) => votes1.push({ meetingId: m1.id, voterId: voter, category: cat, candidateId: cand })
  for (const voter of members) {
    if (voter.id === james.id) {
      cast1(voter.id, "best_speaker", emily.id)
    } else {
      cast1(voter.id, "best_speaker", james.id)
    }
    cast1(voter.id, "best_evaluator", priya.id)
    cast1(voter.id, "best_table_topics", tom.id)
    if (voter.id !== sarah.id) cast1(voter.id, "best_role_player", sarah.id)
  }
  cast1(admin.id, "best_speaker", james.id)
  cast1(admin.id, "best_evaluator", priya.id)
  cast1(admin.id, "best_table_topics", tom.id)
  cast1(admin.id, "best_role_player", sarah.id)
  await db.vote.createMany({ data: votes1 })

  // ---- Past meeting 2 (voting currently OPEN) ----
  const m2 = await db.meeting.create({
    data: {
      title: "Meeting #13 — Leadership in Action",
      theme: "Lead from the front",
      date: day(-7),
      status: "completed",
    },
  })
  await db.attendance.createMany({
    data: [
      ...[sarah, james, priya, michael, emily].map((u) => ({ userId: u.id, meetingId: m2.id, status: "yes" as const })),
      { userId: david.id, meetingId: m2.id, status: "no" as const },
      { userId: aisha.id, meetingId: m2.id, status: "maybe" as const },
    ],
  })
  await db.meetingRole.createMany({
    data: [
      { meetingId: m2.id, userId: james.id, role: "toastmaster" },
      { meetingId: m2.id, userId: sarah.id, role: "speaker" },
      { meetingId: m2.id, userId: tom.id, role: "speaker" },
      { meetingId: m2.id, userId: emily.id, role: "evaluator" },
      { meetingId: m2.id, userId: priya.id, role: "evaluator" },
      { meetingId: m2.id, userId: michael.id, role: "topicsmaster" },
      { meetingId: m2.id, userId: aisha.id, role: "grammarian" },
      { meetingId: m2.id, userId: admin.id, role: "timer" },
    ],
  })
  // Partial votes so far (voting open)
  const votes2: { meetingId: string; voterId: string; category: string; candidateId: string }[] = []
  const cast2 = (voter: string, cat: string, cand: string) => votes2.push({ meetingId: m2.id, voterId: voter, category: cat, candidateId: cand })
  cast2(sarah.id, "best_speaker", tom.id)
  cast2(james.id, "best_speaker", tom.id)
  cast2(priya.id, "best_speaker", tom.id)
  cast2(michael.id, "best_speaker", tom.id)
  cast2(emily.id, "best_speaker", sarah.id)
  cast2(sarah.id, "best_evaluator", priya.id)
  cast2(james.id, "best_evaluator", priya.id)
  cast2(michael.id, "best_evaluator", emily.id)
  cast2(sarah.id, "best_table_topics", michael.id)
  cast2(james.id, "best_table_topics", michael.id)
  cast2(james.id, "best_role_player", aisha.id)
  cast2(michael.id, "best_role_player", james.id)
  await db.vote.createMany({ data: votes2 })

  // ---- Upcoming meeting (scheduled) ----
  const m3 = await db.meeting.create({
    data: {
      title: "Meeting #14 — New Horizons",
      theme: "Setting sail for new goals",
      date: day(7),
      status: "scheduled",
    },
  })
  await db.attendance.createMany({
    data: [
      ...[sarah, james, priya, michael, aisha].map((u) => ({ userId: u.id, meetingId: m3.id, status: "yes" as const })),
      { userId: emily.id, meetingId: m3.id, status: "maybe" as const },
      { userId: tom.id, meetingId: m3.id, status: "no" as const },
    ],
  })
  await db.meetingRole.createMany({
    data: [
      { meetingId: m3.id, userId: priya.id, role: "toastmaster" },
      { meetingId: m3.id, userId: james.id, role: "speaker" },
      { meetingId: m3.id, userId: michael.id, role: "evaluator" },
      { meetingId: m3.id, userId: aisha.id, role: "grammarian" },
    ],
  })
}
