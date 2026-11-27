"use client"

import { motion } from "framer-motion"
import { ArrowRight, CalendarClock, ClipboardList, Mic2, Trophy, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AppData, AppMeeting, View } from "@/lib/client-types"
import { fmtDate, fmtTime, relDayLabel } from "@/lib/client-utils"
import { slotLabel } from "@/lib/constants"
import { RsvpButtons } from "@/components/app/rsvp-buttons"

export function nextScheduledMeeting(meetings: AppMeeting[]): AppMeeting | null {
  const upcoming = meetings.filter((m) => m.status === "scheduled").sort((a, b) => a.date.localeCompare(b.date))
  return upcoming[0] ?? null
}

export function HomeView({ data, refresh, goTo }: { data: AppData; refresh: () => Promise<void>; goTo: (v: View) => void }) {
  const me = data.users.find((u) => u.id === data.user.id)!
  const next = nextScheduledMeeting(data.meetings)
  const openVoting = data.meetings
    .filter((m) => m.status === "completed")
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  const lastClosed = data.meetings.filter((m) => m.status === "closed").sort((a, b) => b.date.localeCompare(a.date))[0]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  const myAttendance = next ? next.attendances.find((a) => a.userId === me.id)?.status : undefined
  const going = next ? next.attendances.filter((a) => a.status === "yes") : []
  const maybe = next ? next.attendances.filter((a) => a.status === "maybe") : []
  const myRolesNext = next ? next.roles.filter((r) => r.userId === me.id) : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}, {me.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {openVoting && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => goTo("voting")}
          className="flex w-full items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-left transition hover:bg-emerald-500/15"
        >
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-600" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-emerald-800 dark:text-emerald-300">Voting is open</span>
            <span className="block text-sm text-emerald-700/90 dark:text-emerald-300/90">
              {openVoting.title} — cast your votes
            </span>
          </span>
          <ArrowRight className="size-4 text-emerald-700 dark:text-emerald-400" />
        </motion.button>
      )}

      {next ? (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-0 sm:flex-row">
            <div className="flex flex-row items-center justify-center border-b bg-primary/5 p-6 sm:w-44 sm:flex-col sm:justify-center sm:gap-1 sm:border-r sm:border-b-0 dark:bg-primary/10">
              <div className="text-center">
                <div className="text-sm font-medium uppercase tracking-wide text-primary">
                  {new Date(next.date).toLocaleDateString(undefined, { month: "short" })}
                </div>
                <div className="text-4xl font-bold leading-none">{new Date(next.date).getDate()}</div>
                <div className="mt-1 text-xs text-muted-foreground">{relDayLabel(next.date)}</div>
              </div>
            </div>
            <div className="flex-1 space-y-4 p-6">
              <div>
                <h2 className="text-lg font-semibold leading-tight">{next.title}</h2>
                {next.theme && <p className="text-sm text-muted-foreground">Theme: {next.theme}</p>}
                {next.venue && (
                  <p className="text-sm text-muted-foreground">
                    📍 {next.venue}
                    {next.mapsUrl && (
                      <a href={next.mapsUrl} target="_blank" rel="noreferrer" className="ml-2 font-medium text-primary hover:underline">
                        Map
                      </a>
                    )}
                  </p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  {fmtDate(next.date)} · {fmtTime(next.date)}
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Will you be there?</p>
                <RsvpButtons meetingId={next.id} current={myAttendance} refresh={refresh} />
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4" /> {going.length} going{maybe.length > 0 && `, ${maybe.length} maybe`}
                </span>
                {myRolesNext.length > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mic2 className="size-4" /> You are {myRolesNext.map((r) => slotLabel(r.role, r.slot)).join(" & ")}
                  </span>
                )}
                <button onClick={() => goTo("meeting")} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  Meeting details & roles <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <CalendarClock className="size-8 text-muted-foreground" />
            <p className="font-medium">No upcoming meeting scheduled</p>
            <p className="text-sm text-muted-foreground">
              {data.user.isAdmin ? "Create the next meeting from the Admin tab." : "Your club admin will schedule it soon."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: <ClipboardList className="size-5" />, label: "Roles played", value: me.totalRoles },
          { icon: <Users className="size-5" />, label: "Meetings attended", value: me.meetingsAttended },
          { icon: <Trophy className="size-5" />, label: "Votes received", value: me.votesReceived },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">{s.icon}</div>
              <div>
                <div className="text-2xl font-bold leading-none">{s.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {lastClosed && <LastWinnersCard meeting={lastClosed} data={data} goTo={goTo} />}
    </div>
  )
}

function LastWinnersCard({ meeting, data, goTo }: { meeting: AppMeeting; data: AppData; goTo: (v: View) => void }) {
  const userById = (id: string) => data.users.find((u) => u.id === id)
  const categories = Object.entries(meeting.voteCounts).filter(([, counts]) => Object.keys(counts).length > 0)
  if (categories.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="size-4 text-amber-500" />
          Winners — {meeting.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {categories.map(([category, counts]) => {
          const max = Math.max(...Object.values(counts))
          const winners = Object.entries(counts).filter(([, c]) => c === max)
          return (
            <div key={category} className="flex items-center gap-3 rounded-lg border p-3">
              <Trophy className="size-4 shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {category.replace(/_/g, " ").replace("best ", "Best ")}
                </div>
                <div className="truncate text-sm font-semibold">
                  {winners.map(([id]) => userById(id)?.name ?? "Unknown").join(" & ")}
                  <span className="ml-1 font-normal text-muted-foreground">({max} votes)</span>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
      <div className="px-6 pb-4">
        <button onClick={() => goTo("voting")} className="text-sm font-medium text-primary hover:underline">
          See full results <ArrowRight className="inline size-3.5" />
        </button>
      </div>
    </Card>
  )
}
