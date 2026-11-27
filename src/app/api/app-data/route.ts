import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser } from "@/lib/auth"
import { ensureSeeded } from "@/lib/seed"
import { getClub } from "@/lib/club"

export async function GET() {
  try {
    await ensureSeeded()
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 })
    }

    const [club, dbUsers, meetings, votes] = await Promise.all([
      getClub(),
      db.user.findMany({
        orderBy: [{ active: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          email: true,
          isAdmin: true,
          active: true,
          attendances: { select: { status: true, meeting: { select: { status: true } } } },
          roleAssignments: { select: { role: true, meeting: { select: { status: true } } } },
          votesReceived: { select: { id: true }, where: { meeting: { status: "closed" } } },
        },
      }),
      db.meeting.findMany({
        orderBy: { date: "desc" },
        take: 100,
        include: {
          attendances: { select: { userId: true, status: true } },
          roles: { select: { id: true, userId: true, role: true, slot: true }, orderBy: [{ role: "asc" }, { slot: "asc" }] },
        },
      }),
      db.vote.findMany({
        select: { meetingId: true, voterId: true, category: true, candidateId: true },
      }),
    ])

    const users = dbUsers.map((u) => {
      const roleCounts: Record<string, number> = {}
      let totalRoles = 0
      for (const ra of u.roleAssignments) {
        if (ra.meeting.status === "scheduled") continue // only count roles already played
        roleCounts[ra.role] = (roleCounts[ra.role] ?? 0) + 1
        totalRoles++
      }
      const meetingsAttended = u.attendances.filter((a) => a.status === "yes" && a.meeting.status !== "scheduled").length
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        isAdmin: u.isAdmin,
        active: u.active,
        roleCounts,
        totalRoles,
        meetingsAttended,
        votesReceived: u.votesReceived.length,
      }
    })

    const meetingPayloads = meetings.map((m) => {
      // While voting is open, only admins see the running tally (keeps the vote fair).
      const resultsHidden = m.status === "completed" && !user.isAdmin
      const voteCounts: Record<string, Record<string, number>> = {}
      const voters = new Set<string>()
      for (const v of votes.filter((v) => v.meetingId === m.id)) {
        voters.add(v.voterId)
        if (resultsHidden) continue
        voteCounts[v.category] = voteCounts[v.category] ?? {}
        voteCounts[v.category][v.candidateId] = (voteCounts[v.category][v.candidateId] ?? 0) + 1
      }
      const myVotes: Record<string, string> = {}
      for (const v of votes.filter((v) => v.meetingId === m.id && v.voterId === user.id)) {
        myVotes[v.category] = v.candidateId
      }
      return {
        id: m.id,
        title: m.title,
        number: m.number,
        theme: m.theme,
        date: m.date.toISOString(),
        venue: m.venue,
        mapsUrl: m.mapsUrl,
        speakerSlots: m.speakerSlots,
        notes: m.notes,
        status: m.status,
        attendances: m.attendances.map((a) => ({ userId: a.userId, status: a.status })),
        roles: m.roles,
        voteCounts,
        voterCount: voters.size,
        resultsHidden,
        myVotes,
      }
    })

    const myVotesAll: Record<string, Record<string, string>> = {}
    for (const m of meetingPayloads) {
      if (Object.keys(m.myVotes).length > 0) myVotesAll[m.id] = m.myVotes
    }

    return NextResponse.json({
      user,
      club,
      users,
      meetings: meetingPayloads,
      myVotes: myVotesAll,
    })
  } catch (e) {
    console.error("app-data error", e)
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 })
  }
}
