"use client"

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/client-utils"
import type { AppData, AppMeeting } from "@/lib/client-types"

const TT = "best_table_topics"

// Shown when the admin marks a meeting completed: pick the Table Topics speakers, then open voting.
export function NominationsDialog({
  meeting,
  data,
  refresh,
  onClose,
}: {
  meeting: AppMeeting
  data: AppData
  refresh: () => Promise<void>
  onClose: () => void
}) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<string[]>(() => meeting.nominations?.[TT] ?? [])

  const going = new Set(meeting.attendances.filter((a) => a.status === "yes").map((a) => a.userId))
  const ttm = meeting.roles.find((r) => r.role === "topicsmaster")?.userId
  const people = data.users
    .filter((u) => u.active && u.id !== ttm)
    .sort((a, b) => Number(going.has(b.id)) - Number(going.has(a.id)) || a.name.localeCompare(b.name))

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  }

  async function save() {
    if (busy) return
    setBusy(true)
    try {
      await api(`/api/meetings/${meeting.id}`, "PATCH", { nominations: { [TT]: picked }, status: "completed" })
      await refresh()
      toast({ title: "Voting is now open for this meeting" })
      onClose()
    } catch (e) {
      toast({ title: "Could not open voting", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Table Topics speakers</DialogTitle>
          <DialogDescription>
            Tap everyone who spoke in Table Topics — only they will be on the ballot for Best Table Topics Speaker. Leave
            empty to list everyone who attended.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {people.map((u) => {
            const on = picked.includes(u.id)
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                aria-pressed={on}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition ${
                  on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {on && <Check className="size-3.5" />}
                {u.name}
              </button>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Open voting
            {picked.length > 0 ? ` (${picked.length} nominated)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
