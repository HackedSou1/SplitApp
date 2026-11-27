export type RoleDef = {
  key: string
  label: string
  short: string
  emoji: string
  group: RoleGroup
  /** true = several numbered slots (Speaker 1, 2, 3); count comes from the meeting */
  multi: boolean
  description: string
}

export type RoleGroup = "opening" | "players" | "speakers" | "evaluators" | "tag" | "backup"

export const ROLE_GROUPS: { key: RoleGroup; label: string }[] = [
  { key: "opening", label: "Opening" },
  { key: "players", label: "Role Players" },
  { key: "speakers", label: "🔶 Speakers" },
  { key: "evaluators", label: "🔷 Evaluators" },
  { key: "tag", label: "TAG Team" },
  { key: "backup", label: "Backup" },
]

export const ROLES: RoleDef[] = [
  { key: "saa", label: "Sergeant at Arms", short: "SAA", emoji: "", group: "opening", multi: false, description: "Opens the meeting, welcomes guests and keeps the room in order." },
  { key: "presiding_officer", label: "Presiding Officer", short: "PO", emoji: "", group: "opening", multi: false, description: "Calls the meeting to order and hands over to the TMoD." },
  { key: "toastmaster", label: "Toastmaster of the Day", short: "TMoD", emoji: "👩🏻‍💼", group: "players", multi: false, description: "Hosts the meeting and introduces every segment." },
  { key: "general_evaluator", label: "General Evaluator", short: "GE", emoji: "", group: "players", multi: false, description: "Evaluates the whole meeting and leads the TAG team." },
  { key: "topicsmaster", label: "Table Topics Master", short: "TTM", emoji: "", group: "players", multi: false, description: "Runs the impromptu speaking segment." },
  { key: "speaker", label: "Speaker", short: "Speaker", emoji: "🎤", group: "speakers", multi: true, description: "Delivers a prepared speech from a Pathways project." },
  { key: "evaluator", label: "Evaluator", short: "Evaluator", emoji: "🎤", group: "evaluators", multi: true, description: "Evaluates the speaker with the same number." },
  { key: "timer", label: "Timer", short: "Timer", emoji: "⏱️", group: "tag", multi: false, description: "Times each speech and shows the timing signals." },
  { key: "ah_counter", label: "Ah Counter", short: "Ah Counter", emoji: "🗣️", group: "tag", multi: false, description: "Counts filler words such as ah, um and er." },
  { key: "grammarian", label: "Grammarian", short: "Grammarian", emoji: "👨‍🏫", group: "tag", multi: false, description: "Tracks language use and the Word of the Day." },
  { key: "active_listener", label: "Active Listener", short: "Active Listener", emoji: "👂🏻", group: "tag", multi: false, description: "Listens closely and quizzes the audience at the end." },
  { key: "backup_speaker", label: "Backup Speaker", short: "Backup Speaker", emoji: "", group: "backup", multi: false, description: "Ready to speak if a speaker drops out." },
]

export const ROLE_KEYS = ROLES.map((r) => r.key)

/** Roles that count as "functionary" for the Best Role Player award */
export const FUNCTIONARY_ROLES = ["saa", "presiding_officer", "toastmaster", "general_evaluator", "topicsmaster", "timer", "ah_counter", "grammarian", "active_listener"]

export const VOTE_CATEGORIES: { key: string; label: string; description: string; roles: string[] | null }[] = [
  { key: "best_speaker", label: "Best Speaker", description: "Who delivered the best prepared speech?", roles: ["speaker", "backup_speaker"] },
  { key: "best_evaluator", label: "Best Evaluator", description: "Who gave the most helpful evaluation?", roles: ["evaluator"] },
  { key: "best_table_topics", label: "Best Table Topics Speaker", description: "Who shone in the impromptu speaking segment?", roles: null },
  { key: "best_role_player", label: "Best Role Player", description: "Who played a functionary role (TMoD, GE, TTM, TAG team, SAA…) best?", roles: FUNCTIONARY_ROLES },
]

export const VOTE_CATEGORY_KEYS = VOTE_CATEGORIES.map((c) => c.key)

export const MEETING_STATUSES = ["scheduled", "completed", "closed"] as const
export type MeetingStatus = (typeof MEETING_STATUSES)[number]

export const ATTENDANCE_STATUSES = ["yes", "no", "maybe"] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const MAX_SLOTS = 6

export function roleDef(key: string): RoleDef | undefined {
  return ROLES.find((r) => r.key === key)
}

export function roleLabel(key: string): string {
  return roleDef(key)?.label ?? key
}

export function roleShort(key: string): string {
  return roleDef(key)?.short ?? key
}

export function isMultiRole(key: string): boolean {
  return roleDef(key)?.multi ?? false
}

/** "Speaker 2" for multi roles, "Timer" for single */
export function slotLabel(key: string, slot: number): string {
  return isMultiRole(key) ? `${roleShort(key)} ${slot}` : roleShort(key)
}
