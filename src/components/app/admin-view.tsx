"use client"

import { useState } from "react"
import {
  CalendarPlus,
  Check,
  Dices,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { api, fmtShortDate, localInputValue } from "@/lib/client-utils"
import { MAX_SLOTS } from "@/lib/constants"
import type { AppData, AppUser } from "@/lib/client-types"
import { MeetingStatusBadge, UserAvatar } from "@/components/app/bits"
import { NominationsDialog } from "@/components/app/nominations-dialog"

function genPassword(): string {
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 6)).join("").slice(0, 10)
}

export function AdminView({ data, refresh }: { data: AppData; refresh: () => Promise<void> }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Manage members and meetings for your club.</p>
      </div>
      <Tabs defaultValue="members">
        <TabsList className="flex-wrap">
          <TabsTrigger value="members">
            <Users className="mr-1.5 size-4" /> Members
          </TabsTrigger>
          <TabsTrigger value="meetings">
            <CalendarPlus className="mr-1.5 size-4" /> Meetings
          </TabsTrigger>
          <TabsTrigger value="club">
            <Settings className="mr-1.5 size-4" /> Club settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="mt-4">
          <MembersTab data={data} refresh={refresh} />
        </TabsContent>
        <TabsContent value="meetings" className="mt-4">
          <MeetingsTab data={data} refresh={refresh} />
        </TabsContent>
        <TabsContent value="club" className="mt-4">
          <ClubTab data={data} refresh={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ---------------- Members ---------------- */

function MembersTab({ data, refresh }: { data: AppData; refresh: () => Promise<void> }) {
  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null)
  const [editTarget, setEditTarget] = useState<AppUser | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [busy, setBusy] = useState(false)

  async function addUser(form: FormData) {
    if (busy) return
    setBusy(true)
    try {
      await api("/api/users", "POST", {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        isAdmin: form.get("isAdmin") === "on",
      })
      await refresh()
      setAddOpen(false)
      toast({ title: "Member added", description: "Share the login details with them so they can sign in." })
    } catch (e) {
      toast({ title: "Could not add member", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword() {
    if (!resetTarget || busy) return
    setBusy(true)
    try {
      await api(`/api/users/${resetTarget.id}`, "PATCH", { password: newPassword })
      await refresh()
      toast({ title: "Password reset", description: `New password for ${resetTarget.name}: ${newPassword}` })
      setResetTarget(null)
    } catch (e) {
      toast({ title: "Could not reset password", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  async function saveDetails(form: FormData) {
    if (!editTarget || busy) return
    setBusy(true)
    try {
      const body: Record<string, unknown> = {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
      }
      if (editTarget.id !== data.user.id) body.isAdmin = form.get("isAdmin") === "on"
      await api(`/api/users/${editTarget.id}`, "PATCH", body)
      await refresh()
      toast({ title: "Member updated", description: String(body.name) })
      setEditTarget(null)
    } catch (e) {
      toast({ title: "Could not update member", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(u: AppUser) {
    try {
      await api(`/api/users/${u.id}`, "PATCH", { active: !u.active })
      await refresh()
      toast({ title: u.active ? "Member deactivated" : "Member reactivated", description: u.name })
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    }
  }

  async function deleteUser(u: AppUser) {
    try {
      await api(`/api/users/${u.id}`, "DELETE")
      await refresh()
      toast({ title: "Member deleted", description: `${u.name} and all their data were removed.` })
    } catch (e) {
      toast({ title: "Could not delete member", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {data.users.filter((u) => u.active).length} active members · admins can add and manage accounts
        </p>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <UserPlus className="size-4" /> Add member
        </Button>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {data.users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-4">
              <UserAvatar user={u} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                  {u.name}
                  {u.isAdmin && (
                    <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
                      <ShieldCheck className="size-3" /> admin
                    </Badge>
                  )}
                  {!u.active && <Badge variant="outline" className="text-muted-foreground">inactive</Badge>}
                  {u.id === data.user.id && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email} · {u.totalRoles} roles · {u.meetingsAttended} meetings
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label={`Manage ${u.name}`}>
                    Manage
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditTarget(u)}>
                    <Pencil className="size-4" /> Edit name / email
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setResetTarget(u)
                      setNewPassword(genPassword())
                    }}
                  >
                    <KeyRound className="size-4" /> Reset password
                  </DropdownMenuItem>
                  {u.id !== data.user.id && (
                    <DropdownMenuItem onClick={() => toggleActive(u)}>{u.active ? "Deactivate" : "Reactivate"}</DropdownMenuItem>
                  )}
                  {u.id !== data.user.id && (
                    <>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {u.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes their account, RSVPs, roles and votes. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => deleteUser(u)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a new member</DialogTitle>
            <DialogDescription>
              Create their account and share the email + password with them. Only admins can add members.
            </DialogDescription>
          </DialogHeader>
          <form action={addUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Full name</Label>
              <Input id="new-name" name="name" placeholder="Jane Cooper" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input id="new-email" name="email" type="email" placeholder="jane@club.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Password</Label>
              <div className="flex gap-2">
                <Input id="new-password" name="password" defaultValue={genPassword()} minLength={6} required />
                <Button type="button" variant="outline" size="icon" onClick={() => {
                  const el = document.getElementById("new-password") as HTMLInputElement | null
                  if (el) el.value = genPassword()
                }} aria-label="Generate a random password">
                  <Dices className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">At least 6 characters. A random one is pre-filled.</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="isAdmin" /> Make this account an admin
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />} Add member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit member dialog */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
            <DialogDescription>Change their display name, login email or admin rights.</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <form action={saveDetails} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ed-name">Full name</Label>
                <Input id="ed-name" name="name" defaultValue={editTarget.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-email">Login email</Label>
                <Input id="ed-email" name="email" type="email" defaultValue={editTarget.email} required />
              </div>
              {editTarget.id !== data.user.id && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox name="isAdmin" defaultChecked={editTarget.isAdmin} /> Admin
                </label>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />} Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={resetTarget !== null} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              {resetTarget ? `Set a new password for ${resetTarget.name}.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">New password</Label>
              <div className="flex gap-2">
                <Input id="reset-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} />
                <Button type="button" variant="outline" size="icon" onClick={() => setNewPassword(genPassword())} aria-label="Generate a random password">
                  <Dices className="size-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetTarget(null)}>
                Cancel
              </Button>
              <Button onClick={resetPassword} disabled={busy || newPassword.length < 6}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save password
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ---------------- Club settings ---------------- */

function ClubTab({ data, refresh }: { data: AppData; refresh: () => Promise<void> }) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const c = data.club

  async function save(form: FormData) {
    if (busy) return
    setBusy(true)
    try {
      await api("/api/club", "PATCH", Object.fromEntries(form.entries()))
      await refresh()
      toast({ title: "Club settings saved" })
    } catch (e) {
      toast({ title: "Could not save", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Club settings</CardTitle>
        <CardDescription>
          Used in the WhatsApp role call and pre-filled whenever you create a new meeting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={save} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="c-name">Club name</Label>
            <Input id="c-name" name="name" defaultValue={c.name} required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="c-venue">Usual venue</Label>
            <Input id="c-venue" name="venue" defaultValue={c.venue ?? ""} placeholder="Creative unlock, Ramphal chowk, Dwarka sector 7" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-maps">Google Maps link</Label>
            <Input id="c-maps" name="mapsUrl" type="url" defaultValue={c.mapsUrl ?? ""} placeholder="https://maps.app.goo.gl/..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-time">Usual start time</Label>
            <Input id="c-time" name="meetingTime" type="time" defaultValue={c.meetingTime} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-script">Roles&apos; script link</Label>
            <Input id="c-script" name="scriptUrl" type="url" defaultValue={c.scriptUrl ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-guide">Role call bible link</Label>
            <Input id="c-guide" name="guideUrl" type="url" defaultValue={c.guideUrl ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/* ---------------- Meetings ---------------- */

function MeetingsTab({ data, refresh }: { data: AppData; refresh: () => Promise<void> }) {
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AppData["meetings"][number] | null>(null)
  const [nomTarget, setNomTarget] = useState<{ meetingId: string } | null>(null)
  const nomMeeting = nomTarget ? data.meetings.find((m) => m.id === nomTarget.meetingId) : undefined
  const [busy, setBusy] = useState(false)

  const [hh, mm] = data.club.meetingTime.split(":").map(Number)
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  nextWeek.setHours(hh ?? 10, mm ?? 45, 0, 0)
  const nextNumber = Math.max(0, ...data.meetings.map((m) => m.number ?? 0)) + 1

  async function createMeeting(form: FormData) {
    if (busy) return
    setBusy(true)
    try {
      await api("/api/meetings", "POST", meetingBody(form))
      await refresh()
      setCreateOpen(false)
      toast({ title: "Meeting created", description: "Members can now RSVP and pick roles." })
    } catch (e) {
      toast({ title: "Could not create meeting", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  async function editMeeting(form: FormData) {
    if (!editTarget || busy) return
    setBusy(true)
    try {
      await api(`/api/meetings/${editTarget.id}`, "PATCH", meetingBody(form))
      await refresh()
      setEditTarget(null)
      toast({ title: "Meeting updated" })
    } catch (e) {
      toast({ title: "Could not update meeting", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(meetingId: string, status: string, message: string) {
    try {
      await api(`/api/meetings/${meetingId}`, "PATCH", { status })
      await refresh()
      toast({ title: message })
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    }
  }

  async function deleteMeeting(meetingId: string) {
    try {
      await api(`/api/meetings/${meetingId}`, "DELETE")
      await refresh()
      toast({ title: "Meeting deleted" })
    } catch (e) {
      toast({ title: "Could not delete meeting", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Mark a meeting <strong>completed</strong> after it happens — that opens voting. Close voting to lock in the
          winners.
        </p>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="shrink-0">
          <Plus className="size-4" /> New meeting
        </Button>
      </div>

      <div className="space-y-3">
        {data.meetings.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              No meetings yet — create the first one!
            </CardContent>
          </Card>
        )}
        {data.meetings.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold leading-tight">
                  {m.title} <MeetingStatusBadge status={m.status} />
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {fmtShortDate(m.date)} · {m.attendances.filter((a) => a.status === "yes").length} RSVPs ·{" "}
                  {m.roles.length} roles · {m.voterCount} voters
                  {m.theme ? ` · ${m.theme}` : ""}
                  {m.venue ? ` · ${m.venue}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {m.status === "scheduled" && (
                  <Button size="sm" variant="outline" onClick={() => setNomTarget({ meetingId: m.id })}>
                    <Check className="size-4" /> Mark completed
                  </Button>
                )}
                {m.status === "completed" && (
                  <Button size="sm" variant="outline" onClick={() => setStatus(m.id, "closed", "Voting closed — winners are locked in")}>
                    Close voting
                  </Button>
                )}
                {m.status === "closed" && (
                  <Button size="sm" variant="outline" onClick={() => setStatus(m.id, "completed", "Voting reopened")}>
                    Reopen voting
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setEditTarget(m)} aria-label="Edit meeting">
                  <Pencil className="size-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" aria-label="Delete meeting">
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this meeting?</AlertDialogTitle>
                      <AlertDialogDescription>
                        &quot;{m.title}&quot; and its RSVPs, roles and votes will be permanently removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => deleteMeeting(m.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {nomTarget && nomMeeting && (
        <NominationsDialog
          meeting={nomMeeting}
          data={data}
          refresh={refresh}
          onClose={() => setNomTarget(null)}
        />
      )}

      {/* Create meeting dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create a meeting</DialogTitle>
            <DialogDescription>Members will be able to RSVP and volunteer for roles right away.</DialogDescription>
          </DialogHeader>
          <form action={createMeeting} className="space-y-4">
            <MeetingFields
              prefix="m"
              defaults={{
                number: String(nextNumber),
                title: `Meeting #${nextNumber}`,
                date: localInputValue(nextWeek.toISOString()),
                theme: "",
                venue: data.club.venue ?? "",
                mapsUrl: data.club.mapsUrl ?? "",
                speakerSlots: "3",
                notes: "",
              }}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />} Create meeting
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit meeting dialog */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit meeting</DialogTitle>
            <DialogDescription>{editTarget ? editTarget.title : ""}</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <form action={editMeeting} className="space-y-4">
              <MeetingFields
                prefix="e"
                defaults={{
                  number: editTarget.number ? String(editTarget.number) : "",
                  title: editTarget.title,
                  date: localInputValue(editTarget.date),
                  theme: editTarget.theme ?? "",
                  venue: editTarget.venue ?? "",
                  mapsUrl: editTarget.mapsUrl ?? "",
                  speakerSlots: String(editTarget.speakerSlots),
                  notes: editTarget.notes ?? "",
                }}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />} Save changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function meetingBody(form: FormData) {
  return {
    number: String(form.get("number") ?? ""),
    title: String(form.get("title") ?? ""),
    theme: String(form.get("theme") ?? ""),
    date: new Date(String(form.get("date"))).toISOString(),
    venue: String(form.get("venue") ?? ""),
    mapsUrl: String(form.get("mapsUrl") ?? ""),
    speakerSlots: Number(form.get("speakerSlots") ?? 3),
    notes: String(form.get("notes") ?? ""),
  }
}

type MeetingDefaults = {
  number: string
  title: string
  date: string
  theme: string
  venue: string
  mapsUrl: string
  speakerSlots: string
  notes: string
}

function MeetingFields({ prefix, defaults }: { prefix: string; defaults: MeetingDefaults }) {
  const id = (k: string) => `${prefix}-${k}`
  return (
    <div className="grid gap-4 sm:grid-cols-[7rem_1fr]">
      <div className="space-y-2">
        <Label htmlFor={id("number")}>Meeting #</Label>
        <Input id={id("number")} name="number" type="number" min={1} defaultValue={defaults.number} placeholder="281" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("title")}>Title</Label>
        <Input id={id("title")} name="title" defaultValue={defaults.title} required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("date")}>Date &amp; time</Label>
        <Input id={id("date")} name="date" type="datetime-local" defaultValue={defaults.date} required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("theme")}>Theme (optional)</Label>
        <Input id={id("theme")} name="theme" defaultValue={defaults.theme} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("venue")}>Venue name / address</Label>
        <Input id={id("venue")} name="venue" defaultValue={defaults.venue} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("maps")}>Google Maps link</Label>
        <Input id={id("maps")} name="mapsUrl" type="url" defaultValue={defaults.mapsUrl} placeholder="https://maps.app.goo.gl/..." />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("slots")}>Number of speakers (and evaluators)</Label>
        <Input id={id("slots")} name="speakerSlots" type="number" min={1} max={MAX_SLOTS} defaultValue={defaults.speakerSlots} required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("notes")}>Notes for members (optional)</Label>
        <Textarea id={id("notes")} name="notes" defaultValue={defaults.notes} placeholder="Parking info, word of the day, dress code…" />
      </div>
    </div>
  )
}
