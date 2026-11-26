"use client"

import { useMemo, useState } from "react"
import { CalendarClock, Hand, Info, Loader2, Mic2, Plus, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { api, fmtDate, fmtTime, relDayLabel } from "@/lib/client-utils"
import { ROLES } from "@/lib/constants"
import type { AppData, AppUser } from "@/lib/client-types"
import { MeetingStatusBadge, UserAvatar } from "@/components/app/bits"
import { RsvpButtons } from "@/components/app/rsvp-buttons"
import { nextScheduledMeeting } from "@/components/app/home-view"

function ordinal(n: number): string {
  if (n === 0) return "new to this role"
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]!} time`
}

export function MeetingView({ data, refresh }: { data: AppData; refresh: () => Promise<void> }) {
  const { toast } = useToast()
  const me = data.users.find((u) => u.id === data.user.id)!
  const meeting = nextScheduledMeeting(data.meetings)

  const userById = useMemo(() => {
    const map = new Map<string, AppUser>()
    for (const u of data.users) map.set(u.id, u)
    return map
  }, [data.users])

  if (!meeting) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
          <CalendarClock className="size-8 text-muted-foreground" />
          <p className="font-medium">No upcoming meeting scheduled</p>
          <p className="text-sm text-muted-foreground">
            {data.user.isAdmin ? "Create the next meeting from the Admin tab." : "Your club admin will schedule it soon."}
          </p>
        </CardContent>
      </Card>
    )
  }

  const groups: { label: string; ids: string[] }[] = [
    { label: "Going", ids: meeting.attendances.filter((a) => a.status === "yes").map((a) => a.userId) },
    { label: "Maybe", ids: meeting.attendances.filter((a) => a.status === "maybe").map((a) => a.userId) },
    { label: "Not going", ids: meeting.attendances.filter((a) => a.status === "no").map((a) => a.userId) },
  ]
  const myAttendance = meeting.attendances.find((a) => a.userId === me.id)?.status
  const goingIds = new Set(groups[0]!.ids)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{meeting.title}</h1>
            <MeetingStatusBadge status={meeting.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmtDate(meeting.date)} · {fmtTime(meeting.date)} · {relDayLabel(meeting.date)}
          </p>
          {meeting.theme && <p className="text-sm text-muted-foreground">Theme: {meeting.theme}</p>}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your RSVP</CardTitle>
          <CardDescription>Let the club know if you can make it.</CardDescription>
        </CardHeader>
        <CardContent>
          <RsvpButtons meetingId={meeting.id} current={myAttendance} refresh={refresh} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-primary" /> Who&apos;s coming
          </CardTitle>
          <CardDescription>
            {groups[0]!.ids.length} going · {groups[1]!.ids.length} maybe · {groups[2]!.ids.length} not going
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups.map((g) =>
            g.ids.length > 0 ? (
              <div key={g.label}>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.label}</p>
                <div className="flex flex-wrap gap-2">
                  {g.ids.map((id) => {
                    const u = userById.get(id)
                    if (!u) return null
                    const roles = meeting.roles.filter((r) => r.userId === id)
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-full border bg-card py-1 pl-1 pr-3 text-sm"
                      >
                        <UserAvatar user={u} className="size-6" />
                        {u.name.split(" ")[0]}
                        {roles.length > 0 && (
                          <span className="text-xs text-muted-foreground">· {roles.map((r) => r.role.replace(/_/g, " ")).join(", ")}</span>
                        )}
                      </span>
                    )
                  })}
                </div>
              </div>
            ) : null
          )}
          {meeting.attendances.length === 0 && (
            <p className="text-sm text-muted-foreground">No responses yet — be the first to RSVP!</p>
          )}
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Mic2 className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Role board</h2>
        </div>
        <p className="mb-4 flex items-start gap-1.5 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          Volunteer for open roles — badges show how many times each person has played the role before, so everyone gets a
          fair turn.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {ROLES.map((role) => (
            <RoleCard
              key={role.key}
              meeting={meeting}
              roleKey={role.key}
              roleLabel={role.label}
              roleDesc={role.description}
              multi={role.multi}
              data={data}
              refresh={refresh}
              goingIds={goingIds}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function RoleCard({
  meeting,
  roleKey,
  roleLabel,
  roleDesc,
  multi,
  data,
  refresh,
  goingIds,
}: {
  meeting: AppData["meetings"][number]
  roleKey: string
  roleLabel: string
  roleDesc: string
  multi: boolean
  data: AppData
  refresh: () => Promise<void>
  goingIds: Set<string>
}) {
  const { toast } = useToast()
  const me = data.users.find((u) => u.id === data.user.id)!
  const assignments = meeting.roles.filter((r) => r.role === roleKey)
  const mine = assignments.some((a) => a.userId === me.id)
  const isTaken = !multi && assignments.length > 0
  const [busy, setBusy] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)

  const userById = (id: string) => data.users.find((u) => u.id === id)

  // Among members who said they're going (and haven't got this role yet), who has played it least?
  const leastPlayed = data.users
    .filter((u) => u.active && goingIds.has(u.id) && !assignments.some((a) => a.userId === u.id))
    .sort((a, b) => (a.roleCounts[roleKey] ?? 0) - (b.roleCounts[roleKey] ?? 0) || a.name.localeCompare(b.name))
    .slice(0, 2)

  async function volunteer() {
    if (busy) return
    setBusy(true)
    try {
      await api("/api/roles", "POST", { meetingId: meeting.id, role: roleKey })
      await refresh()
      toast({ title: "You're in!", description: `You signed up as ${roleLabel}.` })
    } catch (e) {
      toast({ title: "Could not sign up", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  async function remove(assignmentId: string, who: string) {
    if (busy) return
    setBusy(true)
    try {
      await api("/api/roles", "DELETE", { id: assignmentId })
      await refresh()
      toast({ title: who === "me" ? "You withdrew from the role" : "Role assignment removed" })
    } catch (e) {
      toast({ title: "Could not remove", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  async function adminAssign(userId: string) {
    if (busy) return
    setBusy(true)
    try {
      await api("/api/roles", "POST", { meetingId: meeting.id, role: roleKey, userId })
      await refresh()
      toast({ title: "Role assigned", description: `${userById(userId)?.name} is now ${roleLabel}.` })
    } catch (e) {
      toast({ title: "Could not assign", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setBusy(false)
      setAssignOpen(false)
    }
  }

  return (
    <Card className={mine ? "border-primary/50 ring-1 ring-primary/20" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">{roleLabel}</CardTitle>
            <CardDescription className="mt-0.5 text-xs">{roleDesc}</CardDescription>
          </div>
          {multi && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">multiple slots</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignments.length > 0 ? (
          <ul className="space-y-2">
            {assignments.map((a) => {
              const u = userById(a.userId)
              if (!u) return null
              const played = u.roleCounts[roleKey] ?? 0
              const isMe = u.id === me.id
              return (
                <li key={a.id} className="flex items-center gap-2">
                  <UserAvatar user={u} className="size-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {u.name} {isMe && <span className="text-xs font-normal text-primary">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {played === 0 ? "New to this role" : `${ordinal(played)} — ${played}× before`}
                    </p>
                  </div>
                  {(isMe || me.isAdmin) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(a.id, isMe ? "me" : "other")}
                      aria-label={`Remove ${u.name} from ${roleLabel}`}
                      disabled={busy}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Open role
            {leastPlayed.length > 0 && (
              <span className="mt-1 block text-xs">
                Least played by:{" "}
                {leastPlayed.map((u) => (
                  <span key={u.id} className="font-medium text-foreground">
                    {u.name.split(" ")[0]} ({u.roleCounts[roleKey] ?? 0}×)
                  </span>
                ))}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {!isTaken && !mine && (
            <Button size="sm" variant="outline" onClick={volunteer} disabled={busy} className="flex-1">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Hand className="size-4" />}
              Volunteer
            </Button>
          )}
          {mine && (
            <Badge>You&apos;re signed up</Badge>
          )}
          {me.isAdmin && !isTaken && (
            assignOpen ? (
              <div className="flex flex-1 items-center gap-2">
                <Label htmlFor={`assign-${roleKey}`} className="sr-only">
                  Assign {roleLabel}
                </Label>
                <Select onValueChange={(v) => v && adminAssign(v)}>
                  <SelectTrigger id={`assign-${roleKey}`} size="sm" className="flex-1">
                    <SelectValue placeholder="Assign member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {data.users
                      .filter((u) => u.active && !assignments.some((a) => a.userId === u.id))
                      .sort((a, b) => Number(goingIds.has(b.id)) - Number(goingIds.has(a.id)) || a.name.localeCompare(b.name))
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {goingIds.has(u.id) ? "● " : "○ "}
                          {u.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setAssignOpen(false)} aria-label="Cancel assign">
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setAssignOpen(true)} className="flex-1" disabled={busy}>
                <Plus className="size-4" /> Assign (admin)
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{children}</span>
}
