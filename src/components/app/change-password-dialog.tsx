"use client"

import { useState } from "react"
import { Check, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/client-utils"

export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(form: FormData) {
    if (busy) return
    const currentPassword = String(form.get("current") ?? "")
    const newPassword = String(form.get("new") ?? "")
    if (newPassword !== String(form.get("confirm") ?? "")) {
      setError("The new passwords don't match")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api("/api/auth/password", "POST", { currentPassword, newPassword })
      toast({ title: "Password changed", description: "Use your new password next time you sign in." })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change password")
    } finally {
      setBusy(false)
    }
  }

  const type = show ? "text" : "password"
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setError(null)
        setShow(false)
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Other devices signed in to your account will be signed out.</DialogDescription>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cp-current">Current password</Label>
            <Input id="cp-current" name="current" type={type} autoComplete="current-password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-new">New password</Label>
            <Input id="cp-new" name="new" type={type} autoComplete="new-password" minLength={6} required />
            <p className="text-xs text-muted-foreground">At least 6 characters.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-confirm">Confirm new password</Label>
            <Input id="cp-confirm" name="confirm" type={type} autoComplete="new-password" minLength={6} required />
          </div>
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {show ? "Hide" : "Show"} passwords
          </button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Change password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
