"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { avatarClass, initials } from "@/lib/client-utils"
import { roleShort } from "@/lib/constants"
import type { AppUser } from "@/lib/client-types"

export function UserAvatar({ user, className }: { user: AppUser; className?: string }) {
  return (
    <Avatar className={className}>
      <AvatarFallback className={`text-xs font-semibold ${avatarClass(user.name)}`}>{initials(user.name)}</AvatarFallback>
    </Avatar>
  )
}

export function MeetingStatusBadge({ status }: { status: string }) {
  if (status === "scheduled") {
    return <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">Scheduled</Badge>
  }
  if (status === "completed") {
    return <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Voting open</Badge>
  }
  return <Badge variant="outline" className="border-muted-foreground/30 bg-muted text-muted-foreground">Voting closed</Badge>
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant="secondary" className="font-medium">
      {roleShort(role)}
    </Badge>
  )
}
