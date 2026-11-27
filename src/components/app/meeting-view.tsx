"use client"

import { useMemo, useState } from "react"
import { CalendarClock, Check, Copy, Info, Loader2, MapPin, Mic2, Share2, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { api, fmtDate, fmtTime, relDayLabel } from "@/lib/client-utils"
import { ROLES, ROLE_GROUPS, slotLabel, type RoleDef } from "@/lib/constants"
import { buildRoleCall } from "@/lib/role-call"
import type { AppData, AppMeeting, AppUser } from "@/lib/client-types"
import { MeetingStatusBadge, UserAvatar } from "@/components/app/bits"
import { RsvpButtons } from "@/components/app/rsvp-buttons"
import { nextScheduledMeeting } from "@/components/app/home-view"

export function MeetingView({ data, refresh }: { data: AppData; refresh: () => Promise<void> }) {
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
  const myRole = meeting.roles.find((r) => r.userId === me.id)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{meeting.title}</h1>
          <MeetingStatusBadge status={meeting.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {fmtDate(meeting.date)} · {fmtTime(meeting.date)} · {relDayLabel(meeting.date)}
        </p>
        {meeting.theme && <p className="text-sm text-muted-foreground">Theme: {meeting.theme}</p>}
        {(meeting.venue || meeting.mapsUrl) && (
          <p className="mt-1 flex items-start gap-1.5 text-sm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              {meeting.venue}
              {meeting.mapsUrl && (
                <a href={meeting.mapsUrl} target="_blank" rel="noreferrer" className="ml-2 font-medium text-primary hover:underline">
                  Open in Google Maps
                </a>
              )}
            </span>
          </p>
        )}
        {meeting.notes && <p className="mt-2 whitespace-pre-line rounded-lg bg-muted/50 px-3 py-2 text-sm">{meeting.notes}</p>}
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
                      <span key={id} className="inline-flex items-center gap-1.5 rounded-full border bg-card py-1 pl-1 pr-3 text-sm">
                        <UserAvatar user={u} className="size-6" />
                        {u.name.split(" ")[0]}
                        {roles.length > 0 && (
                          <span className="text-xs text-muted-foreground">· {roles.map((r) => slotLabel(r.role, r.slot)).join(", ")}</span>
                        )}
                      </span>
                    )
                  })}
                </div>
              </div>
            ) : null
          )}
          {meeting.attendances.length === 0 && <p className="text-sm text-muted-foreground">No responses yet — be the first to RSVP!</p>}
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mic2 className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Role board</h2>
          </div>
          <RoleCallButtons meeting={meeting} data={data} />
        </div>
        <p className="mb-4 flex items-start gap-1.5 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          {myRole
            ? `You are ${slotLabel(myRole.role, myRole.slot)}. One role per person — withdraw first if you want a different one.`
            : "Pick one open role. Once someone takes a role it is locked for everyone else. The board updates by itself."}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {ROLE_GROUPS.map((g) => {
            const roles = ROLES.filter((r) => r.group === g.key)
            return (
              <Card key={g.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{g.label}</CardTitle>
                </CardHeader>
                <CardContent className="divide-y p-0">
                  {roles.flatMap((role) =>
                    (role.multi ? Array.from({ length: meeting.speakerSlots }, (_, i) => i + 1) : [1]).map((slot) => (
                      <SlotRow
                        key={`${role.key}-${slot}`}
                        meeting={meeting}
                        role={role}
                        slot={slot}
                        data={data}
                        refresh={refresh}
                        goingIds={goingIds}
                        iHaveRole={Boolean(myRole)}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RoleCallButtons({ meeting, data }: { meeting: AppMeeting; data: AppData }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const text = () => buildRoleCall(meeting, data)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({ title: "Role call copied", description: "Paste it into your WhatsApp group." })
    } catch {
      toast({ title: "Could not copy", variant: "destructive" })
    }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={copy}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copy role call
      </Button>
      <Button size="sm" variant="outline" asChild>
        <a href={`https://wa.me/?text=${encodeURIComponent(text())}`} target="_blank" rel="noreferrer">
          <Share2 className="size-4" /> WhatsApp
        </a>
      </Button>
    </div>
  )
}

function SlotRow({
  meeting,
  role,
  slot,
  data,
  refresh,
  goingIds,
  iHaveRole,
}: {
  meeting: AppMeeting
  role: RoleDef
  slot: number
  data: AppData
  refresh: () => Promise<void>
  goingIds: Set<string>
  iHaveRole: boolean
}) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const me = data.user
  const label = slotLabel(role.key, slot)
  const assignment = meeting.roles.find((r) => r.role === role.key && r.slot === slot)
  const holder = assignment ? data.users.find((u) => u.id === assignment.userId) : undefined
  const isMine = assignment?.userId === me.id
  const roleOf = (userId: string) => meeting.roles.find((r) => r.userId === userId)

  async function run(fn: () => Promise<unknown>, success: string) {
    if (busy) return
    setBusy(true)
    try {
      await fn()
      toast({ title: success })
    } catch (e) {
      toast({ title: "Could not update role", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      await refresh()
      setBusy(false)
    }
  }

  function adminPick(userId: string) {
    const u = data.users.find((x) => x.id === userId)
    if (!u) return
    const other = roleOf(userId)
    let force = false
    if (other && other.id !== assignment?.id) {
      if (!window.confirm(`${u.name} is already ${slotLabel(other.role, other.slot)}. Give them ${label} as well?`)) return
      force = true
    }
    if (assignment) {
      run(() => api("/api/roles", "PATCH", { id: assignment.id, userId, force }), `${label} reassigned to ${u.name}`)
    } else {
      run(() => api("/api/roles", "POST", { meetingId: meeting.id, role: role.key, slot, userId, force }), `${u.name} is now ${label}`)
    }
  }

  const leastPlayed = !assignment
    ? data.users
        .filter((u) => u.active && goingIds.has(u.id) && !roleOf(u.id))
        .sort((a, b) => (a.roleCounts[role.key] ?? 0) - (b.roleCounts[role.key] ?? 0) || a.name.localeCompare(b.name))
        .slice(0, 2)
    : []

  return (
    <div className={`flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap ${isMine ? "bg-primary/5" : ""}`}>
      <div className="w-36 shrink-0" title={role.description}>
        <p className="text-sm font-semibold">
          {role.emoji && <span className="mr-1">{role.emoji}</span>}
          {label}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        {holder ? (
          <span className="flex items-center gap-2">
            <UserAvatar user={holder} className="size-7" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {holder.name} {isMine && <span className="text-xs font-normal text-primary">(you)</span>}
              </span>
              <span className="block text-xs text-muted-foreground">
                {(holder.roleCounts[role.key] ?? 0) === 0 ? "First time in this role" : `Played ${holder.roleCounts[role.key]}× before`}
              </span>
            </span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            Open
            {leastPlayed.length > 0 && (
              <span className="block text-xs">
                Least played by {leastPlayed.map((u) => `${u.name.split(" ")[0]} (${u.roleCounts[role.key] ?? 0}×)`).join(", ")}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {!assignment && !iHaveRole && !me.isAdmin && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => run(() => api("/api/roles", "POST", { meetingId: meeting.id, role: role.key, slot }), `You're ${label}!`)}
          >
            Take
          </Button>
        )}
        {me.isAdmin && (
          <Select value="" onValueChange={(v) => v && adminPick(v)}>
            <SelectTrigger size="sm" className="w-32" aria-label={`${assignment ? "Reassign" : "Assign"} ${label}`} disabled={busy}>
              <SelectValue placeholder={assignment ? "Reassign" : "Assign"} />
            </SelectTrigger>
            <SelectContent>
              {data.users
                .filter((u) => u.active && u.id !== assignment?.userId)
                .sort((a, b) => Number(goingIds.has(b.id)) - Number(goingIds.has(a.id)) || a.name.localeCompare(b.name))
                .map((u) => {
                  const other = roleOf(u.id)
                  return (
                    <SelectItem key={u.id} value={u.id}>
                      {goingIds.has(u.id) ? "● " : "○ "}
                      {u.name}
                      {u.id === me.id ? " (me)" : ""}
                      {other ? ` — ${slotLabel(other.role, other.slot)}` : ""}
                    </SelectItem>
                  )
                })}
            </SelectContent>
          </Select>
        )}
        {assignment && (isMine || me.isAdmin) && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            disabled={busy}
            onClick={() =>
              run(() => api("/api/roles", "DELETE", { id: assignment.id }), isMine ? `You withdrew from ${label}` : `${label} is open again`)
            }
            aria-label={isMine ? `Withdraw from ${label}` : `Remove ${holder?.name} from ${label}`}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
