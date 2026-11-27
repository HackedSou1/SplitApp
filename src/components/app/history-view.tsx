"use client"

import { useMemo } from "react"
import { ClipboardList, History, Trophy, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fmtShortDate } from "@/lib/client-utils"
import { ROLES, roleShort } from "@/lib/constants"
import type { AppData, AppMeeting } from "@/lib/client-types"
import { MeetingStatusBadge, UserAvatar } from "@/components/app/bits"

export function HistoryView({ data }: { data: AppData }) {
  const me = data.users.find((u) => u.id === data.user.id)!
  const activeUsers = data.users.filter((u) => u.active)
  const pastMeetings = data.meetings.filter((m) => m.status !== "scheduled")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Role history</h1>
        <p className="text-sm text-muted-foreground">
          See how often everyone has played each role — keep assignments fair and balanced.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-4 text-primary" /> My journey
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ROLES.map((r) => {
            const count = me.roleCounts[r.key] ?? 0
            return (
              <div
                key={r.key}
                className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
                title={r.label}
              >
                <span className="text-muted-foreground">{r.short}</span>
                <span className={`font-semibold ${count === 0 ? "text-muted-foreground/50" : ""}`}>{count}×</span>
              </div>
            )
          })}
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm">
            <Users className="size-4 text-primary" />
            <span className="font-semibold">{me.meetingsAttended}</span> meetings attended
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4 text-primary" /> Role balance across the club
          </CardTitle>
          <CardDescription>Times each member has played each role in past meetings.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-card">Role</TableHead>
                {activeUsers.map((u) => {
                  const isMe = u.id === me.id
                  return (
                    <TableHead key={u.id} className={`text-center ${isMe ? "bg-primary/5" : ""}`}>
                      <span className="flex flex-col items-center gap-1 whitespace-nowrap py-1" title={u.name}>
                        <UserAvatar user={u} className="size-6" />
                        <span>
                          {u.name.split(" ")[0]}
                          {isMe && <span className="text-xs text-primary"> (you)</span>}
                        </span>
                      </span>
                    </TableHead>
                  )
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLES.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="sticky left-0 z-10 bg-card font-medium whitespace-nowrap">{r.label}</TableCell>
                  {activeUsers.map((u) => {
                    const c = u.roleCounts[r.key] ?? 0
                    return (
                      <TableCell
                        key={u.id}
                        className={`text-center ${u.id === me.id ? "bg-primary/5" : ""} ${c === 0 ? "text-muted-foreground/40" : ""}`}
                      >
                        {c === 0 ? "–" : c}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="sticky left-0 z-10 bg-card font-semibold">Total</TableCell>
                {activeUsers.map((u) => (
                  <TableCell key={u.id} className={`text-center font-semibold ${u.id === me.id ? "bg-primary/5" : ""}`}>
                    {u.totalRoles}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PastMeetings data={data} meetings={pastMeetings} />
    </div>
  )
}

function PastMeetings({ data, meetings }: { data: AppData; meetings: AppMeeting[] }) {
  const userById = useMemo(() => {
    const map = new Map<string, AppData["users"][number]>()
    for (const u of data.users) map.set(u.id, u)
    return map
  }, [data.users])

  if (meetings.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          No past meetings yet. Once a meeting is completed, it shows up here with its roles and winners.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Past meetings</h2>
      {meetings.map((m) => {
        const going = m.attendances.filter((a) => a.status === "yes")
        const categories = Object.entries(m.voteCounts).filter(([, counts]) => Object.keys(counts).length > 0)
        return (
          <Card key={m.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold leading-tight">{m.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {fmtShortDate(m.date)} · {going.length} attended · {m.roles.length} roles
                  </p>
                </div>
                <MeetingStatusBadge status={m.status} />
              </div>

              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  {categories.map(([category, counts]) => {
                    const max = Math.max(...Object.values(counts))
                    const winners = Object.entries(counts).filter(([, c]) => c === max)
                    return (
                      <span key={category} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs">
                        <Trophy className="size-3.5 text-amber-500" />
                        <span className="capitalize text-muted-foreground">{category.replace(/_/g, " ").replace("best ", "best ")}</span>
                        <span className="font-semibold">
                          {winners.map(([id]) => userById.get(id)?.name ?? "?").join(" & ")}
                        </span>
                      </span>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
