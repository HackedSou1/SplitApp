"use client"

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/client-utils"
import { VOTE_CATEGORIES, slotLabel } from "@/lib/constants"
import { defaultNominees } from "@/lib/voting"
import type { AppData, AppMeeting } from "@/lib/client-types"

// Admin picks who can be voted for in each award. Used when opening voting (and to edit later).
export function NominationsDialog({
  meeting,
  openVoting,
  data,
  refresh,
  onClose,
}: {
  meeting: AppMeeting
  openVoting: boolean
  data: AppData
  refresh: () => Promise<void>
  onClose: () => void
}) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      VOTE_CATEGORIES.map((c) => [
        c.key,
        meeting.nominations?.[c.key]?.length
          ? meeting.nominations[c.key]!
          : c.key === "best_table_topics"
            ? [] // table topics speakers aren't known in advance: admin picks them
            : defaultNominees(meeting, c.key, data.users, true),
      ])
    )
  )

  const going = new Set(meeting.attendances.filter((a) => a.status === "yes").map((a) => a.userId))
  const roleOf = (id: string) => meeting.roles.filter((r) => r.userId === id).map((r) => slotLabel(r.role, r.slot))
  const people = data.users
    .filter((u) => u.active)
    .sort(
      (a, b) =>
        Number(going.has(b.id) || roleOf(b.id).length > 0) - Number(going.has(a.id) || roleOf(a.id).length > 0) ||
        a.name.localeCompare(b.name)
    )

  function toggle(cat: string, id: string) {
    setPicked((p) => ({ ...p, [cat]: p[cat]!.includes(id) ? p[cat]!.filter((x) => x !== id) : [...p[cat]!, id] }))
  }

  async function save() {
    if (busy) return
    if (openVoting && picked.best_table_topics!.length === 0) {
      if (!window.confirm("No Table Topics nominees picked — everyone who attended will be on the ballot. Continue?")) return
    }
    setBusy(true)
    try {
      await api(`/api/meetings/${meeting.id}`, "PATCH", {
        nominations: picked,
        ...(openVoting ? { status: "completed" } : {}),
      })
      await refresh()
      toast({ title: openVoting ? "Voting is now open" : "Nominations saved" })
      onClose()
    } catch (e) {
      toast({ title: "Could not save", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{openVoting ? "Pick nominees & open voting" : "Edit nominees"}</DialogTitle>
          <DialogDescription>
            Tap names to add or remove them from each award. Speakers, evaluators and role players are pre-selected from
            the role board. If an award has nobody picked, everyone who attended is on the ballot.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {VOTE_CATEGORIES.map((c) => (
            <div key={c.key}>
              <p className="mb-2 text-sm font-semibold">
                {c.label} <span className="font-normal text-muted-foreground">· {picked[c.key]!.length} nominated</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {people.map((u) => {
                  const on = picked[c.key]!.includes(u.id)
                  const roles = roleOf(u.id)
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggle(c.key, u.id)}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition ${
                        on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                    >
                      {on && <Check className="size-3.5" />}
                      {u.name}
                      {roles.length > 0 && <span className={on ? "text-primary-foreground/80" : "text-muted-foreground"}>· {roles.join(", ")}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {openVoting ? "Open voting" : "Save nominees"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
