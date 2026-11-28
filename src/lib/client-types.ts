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
  number: number | null
  theme: string | null
  date: string
  venue: string | null
  mapsUrl: string | null
  speakerSlots: number
  notes: string | null
  nominations: Record<string, string[]> | null
  status: "scheduled" | "completed" | "closed"
  attendances: { userId: string; status: string }[]
  roles: { id: string; userId: string; role: string; slot: number }[]
  voteCounts: Record<string, Record<string, number>>
  voterCount: number
  /** true when voting is open and results are hidden from this (non-admin) user */
  resultsHidden: boolean
  myVotes: Record<string, string>
}

export type Club = {
  name: string
  venue: string | null
  mapsUrl: string | null
  meetingTime: string
  scriptUrl: string | null
  guideUrl: string | null
}

export type AppData = {
  user: SessionUser
  club: Club
  users: AppUser[]
  meetings: AppMeeting[]
}

export type View = "home" | "meeting" | "history" | "voting" | "admin"
