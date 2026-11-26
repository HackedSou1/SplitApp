export type SessionUser = {
  id: string
  name: string
  email: string
  isAdmin: boolean
}

export type AppUser = {
  id: string
  name: string
  email: string
  isAdmin: boolean
  active: boolean
  roleCounts: Record<string, number>
  totalRoles: number
  meetingsAttended: number
  votesReceived: number
}

export type AppMeeting = {
  id: string
  title: string
  theme: string | null
  date: string
  status: "scheduled" | "completed" | "closed"
  attendances: { userId: string; status: string }[]
  roles: { id: string; userId: string; role: string }[]
  voteCounts: Record<string, Record<string, number>>
  voterCount: number
  myVotes: Record<string, string>
}

export type AppData = {
  user: SessionUser
  users: AppUser[]
  meetings: AppMeeting[]
}

export type View = "home" | "meeting" | "history" | "voting" | "admin"
