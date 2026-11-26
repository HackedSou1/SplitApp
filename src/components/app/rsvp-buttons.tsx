"use client"

import { useState } from "react"
import { Check, HelpCircle, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/client-utils"

const RSVP_OPTIONS: { key: "yes" | "no" | "maybe"; label: string; icon: React.ReactNode; active: string }[] = [
  { key: "yes", label: "Going", icon: <Check className="size-4" />, active: "bg-emerald-600 text-white hover:bg-emerald-600 border-emerald-600" },
  { key: "maybe", label: "Maybe", icon: <HelpCircle className="size-4" />, active: "bg-amber-500 text-white hover:bg-amber-500 border-amber-500" },
  { key: "no", label: "Can't make it", icon: <X className="size-4" />, active: "bg-rose-600 text-white hover:bg-rose-600 border-rose-600" },
]

export function RsvpButtons({
  meetingId,
  current,
  refresh,
}: {
  meetingId: string
  current: string | undefined
  refresh: () => Promise<void>
}) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  async function set(status: string) {
    if (busy || current === status) return
    setBusy(true)
    try {
      await api("/api/attendance", "POST", { meetingId, status })
      await refresh()
      const label = status === "yes" ? "You're going — see you there!" : status === "maybe" ? "Marked as maybe" : "Sorry you can't make it"
      toast({ title: "RSVP saved", description: label })
    } catch (e) {
      toast({ title: "Could not save RSVP", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {RSVP_OPTIONS.map((opt) => (
        <Button
          key={opt.key}
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => set(opt.key)}
          className={`h-10 ${current === opt.key ? opt.active : ""}`}
          aria-pressed={current === opt.key}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : opt.icon}
          {opt.label}
        </Button>
      ))}
    </div>
  )
}
