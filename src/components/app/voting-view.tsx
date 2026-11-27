"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { BarChart3, Check, Loader2, RefreshCw, Trophy, Vote, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { api, fmtShortDate } from "@/lib/client-utils"
import { VOTE_CATEGORIES } from "@/lib/constants"
import type { AppData, AppMeeting } from "@/lib/client-types"
import { MeetingStatusBadge, RoleBadge, UserAvatar } from "@/components/app/bits"

export function VotingView({ data, refresh }: { data: AppData; refresh: () => Promise<void> }) {
  const { toast } = useToast()
  const votableMeetings = data.meetings.filter((m) => m.status !== "scheduled")
  const defaultMeeting =
    votableMeetings.find((m) => m.status === "completed") ?? votableMeetings[0] ?? null
  const [selectedId, setSelectedId] = useState<string | null>(defaultMeeting?.id ?? null)
  const [busyCategory, setBusyCategory] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // keep selection valid as data refreshes
  const meeting = useMemo(() => {
    const found = votableMeetings.find((m) => m.id === selectedId)
    return found ?? defaultMeeting
  }, [selectedId, votableMeetings, defaultMeeting])

  const isOpen = meeting?.status === "completed"
  const me = data.users.find((u) => u.id === data.user.id)!

  const userById = useMemo(() => {
    const map = new Map<string, AppData["users"][number]>()
    for (const u of data.users) map.set(u.id, u)
    return map
  }, [data.users])

  function candidatesFor(m: AppMeeting, category: string): string[] {
    const attendeeIds = new Set<string>([
      ...m.attendances.filter((a) => a.status === "yes").map((a) => a.userId),
      ...m.roles.map((r) => r.userId),
    ])
    let ids: string[]
    const cat = VOTE_CATEGORIES.find((c) => c.key === category)
    if (cat?.roles) {
      const roleHolders = Array.from(new Set(m.roles.filter((r) => cat.roles!.includes(r.role)).map((r) => r.userId)))
      ids = roleHolders.length > 0 ? roleHolders : Array.from(attendeeIds)
    } else {
      ids = Array.from(attendeeIds)
    }
    if (category === "best_table_topics") {
      const ttm = m.roles.find((r) => r.role === "topicsmaster")?.userId
      const withoutTtm = ids.filter((id) => id !== ttm)
      if (withoutTtm.length > 0) ids = withoutTtm
    }
    return ids
      .filter((id) => {
        const u = userById.get(id)
        return u && u.active
      })
      .sort((a, b) => (userById.get(a)!.name.localeCompare(userById.get(b)!.name)))
  }

  async function castVote(category: string, candidateId: string | null) {
    if (!meeting || busyCategory) return
    setBusyCategory(category)
    try {
      await api("/api/votes", "POST", { meetingId: meeting.id, category, candidateId })
      await refresh()
      const label = VOTE_CATEGORIES.find((c) => c.key === category)?.label
      if (candidateId) {
        toast({ title: "Vote recorded", description: `${label}: ${userById.get(candidateId)?.name}` })
      } else {
        toast({ title: "Vote cleared", description: `${label}` })
      }
    } catch (e) {
      toast({ title: "Could not save vote", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setBusyCategory(null)
    }
  }

  if (!meeting) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
          <Vote className="size-8 text-muted-foreground" />
          <p className="font-medium">Nothing to vote on yet</p>
          <p className="text-sm text-muted-foreground">
            Once your club admin marks a meeting as completed, voting opens here.
          </p>
        </CardContent>
      </Card>
    )
  }

  const myVotes = meeting.myVotes
  const votedCount = VOTE_CATEGORIES.filter((c) => myVotes[c.key]).length
  const activeMembers = data.users.filter((u) => u.active).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meeting awards</h1>
          <p className="text-sm text-muted-foreground">
            Vote for the best speaker, evaluator, table topics speaker and role player.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Select value={meeting.id} onValueChange={setSelectedId}>
            <SelectTrigger aria-label="Choose meeting" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {votableMeetings.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {fmtShortDate(m.date)} — {m.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold leading-tight">{meeting.title}</p>
            <MeetingStatusBadge status={meeting.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {fmtShortDate(meeting.date)}
            {meeting.theme ? ` · Theme: ${meeting.theme}` : ""}
          </p>
        </div>
        {isOpen && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
            </span>
            Voting open
            <button
              onClick={async () => {
                setRefreshing(true)
                await refresh().finally(() => setRefreshing(false))
              }}
              className="ml-1 rounded p-1 hover:bg-muted"
              aria-label="Refresh results"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </span>
        )}
      </div>

      {isOpen ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Vote className="size-4 text-primary" /> Your ballot
            </CardTitle>
            <CardDescription>
              Tap a name to vote — you can change your mind until voting closes. You can&apos;t vote for yourself.
              Ballots are secret and results are revealed when the admin closes voting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex items-center gap-3">
              <Progress value={(votedCount / VOTE_CATEGORIES.length) * 100} className="h-2 flex-1" />
              <span className="text-sm font-medium text-muted-foreground">
                {votedCount}/{VOTE_CATEGORIES.length} voted
              </span>
            </div>
            <div className="space-y-6">
              {VOTE_CATEGORIES.map((cat) => {
                const candidates = candidatesFor(meeting, cat.key).filter((id) => id !== me.id)
                const myPick = myVotes[cat.key]
                const busy = busyCategory === cat.key
                return (
                  <div key={cat.key}>
                    <p className="mb-1 font-semibold">{cat.label}</p>
                    <p className="mb-2 text-sm text-muted-foreground">{cat.description}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {candidates.map((id) => {
                        const u = userById.get(id)!
                        const roles = meeting.roles.filter((r) => r.userId === id)
                        const selected = myPick === id
                        return (
                          <button
                            key={id}
                            type="button"
                            disabled={busy}
                            onClick={() => castVote(cat.key, id)}
                            className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                              selected
                                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                : "hover:border-primary/40 hover:bg-muted/50"
                            }`}
                            aria-pressed={selected}
                          >
                            <span
                              className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                              }`}
                            >
                              {selected && <Check className="size-3" />}
                            </span>
                            <UserAvatar user={u} className="size-8" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{u.name}</span>
                              {roles.length > 0 && (
                                <span className="mt-0.5 flex flex-wrap gap-1">
                                  {roles.map((r) => (
                                    <RoleBadge key={r.id} role={r.role} />
                                  ))}
                                </span>
                              )}
                            </span>
                            {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                          </button>
                        )
                      })}
                      {candidates.length === 0 && (
                        <p className="text-sm text-muted-foreground">No candidates for this category.</p>
                      )}
                    </div>
                    {myPick && (
                      <button
                        onClick={() => castVote(cat.key, null)}
                        className="mt-2 text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        Clear my {cat.label.toLowerCase()} vote
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Voting for this meeting is closed — final results below.
        </p>
      )}

      <ResultsCard meeting={meeting} data={data} userById={userById} />

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <BarChart3 className="size-3.5" />
        {meeting.voterCount} of {activeMembers} members have voted. Only totals are shown — individual ballots stay
        private.
      </p>
    </div>
  )
}

function ResultsCard({
  meeting,
  data,
  userById,
}: {
  meeting: AppMeeting
  data: AppData
  userById: Map<string, AppData["users"][number]>
}) {
  void data
  const isOpen = meeting.status === "completed"
  if (meeting.resultsHidden) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4 text-amber-500" /> Results
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Results stay hidden while voting is open, so nobody is influenced. They appear here as soon as the admin closes
          voting.
        </CardContent>
      </Card>
    )
  }
  const categories = VOTE_CATEGORIES.filter((c) => Object.keys(meeting.voteCounts[c.key] ?? {}).length > 0)

  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4 text-amber-500" /> Results
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {isOpen ? "No votes yet — be the first to cast one above!" : "No votes were recorded for this meeting."}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="size-4 text-amber-500" /> {isOpen ? "Live results" : "Final results"}
        </CardTitle>
        <CardDescription>
          {isOpen ? "Only admins can see this while voting is open." : "The winners of this meeting's awards."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {categories.map((cat) => {
          const counts = Object.entries(meeting.voteCounts[cat.key] ?? {})
          const total = counts.reduce((s, [, c]) => s + c, 0)
          const max = Math.max(0, ...counts.map(([, c]) => c))
          const sorted = [...counts].sort((a, b) => b[1] - a[1])
          return (
            <div key={cat.key}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-semibold">{cat.label}</p>
                <p className="text-xs text-muted-foreground">
                  {total} vote{total === 1 ? "" : "s"}
                </p>
              </div>
              <div className="space-y-2">
                {sorted.map(([candidateId, count], idx) => {
                  const u = userById.get(candidateId)
                  if (!u) return null
                  const isTop = count === max && max > 0
                  return (
                    <div key={candidateId} className="flex items-center gap-3">
                      <UserAvatar user={u} className="size-8 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                          <span className={`truncate ${isTop ? "font-semibold" : ""}`}>
                            {u.name}
                            {isTop && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                                {meeting.status === "closed" ? <Trophy className="size-3" /> : <Zap className="size-3" />}
                                {meeting.status === "closed" ? "winner" : "leading"}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">{count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <AnimatePresence initial={false}>
                            <motion.div
                              key={`${candidateId}-${count}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                              transition={{ type: "spring", stiffness: 120, damping: 20 }}
                              className={`h-full rounded-full ${isTop ? "bg-amber-500" : idx === 0 ? "bg-primary/70" : "bg-primary/40"}`}
                            />
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
