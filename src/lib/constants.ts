export const ROLES: { key: string; label: string; short: string; multi: boolean; description: string }[] = [
  { key: "toastmaster", label: "Toastmaster of the Day", short: "TMOD", multi: false, description: "Leads the entire meeting as the host and Master of Ceremonies." },
  { key: "speaker", label: "Prepared Speaker", short: "Speaker", multi: true, description: "Delivers a prepared speech from a Pathways project." },
  { key: "evaluator", label: "Evaluator", short: "Evaluator", multi: true, description: "Gives constructive feedback to a prepared speaker." },
  { key: "topicsmaster", label: "Table Topics Master", short: "Topics", multi: false, description: "Runs the impromptu speaking segment." },
  { key: "grammarian", label: "Grammarian", short: "Grammar", multi: false, description: "Tracks language usage and the Word of the Day." },
  { key: "ah_counter", label: "Ah Counter", short: "Ah", multi: false, description: "Counts filler words such as ah, um and er." },
  { key: "timer", label: "Timer", short: "Timer", multi: false, description: "Times each speech and shows the timing signals." },
  { key: "general_evaluator", label: "General Evaluator", short: "GE", multi: false, description: "Evaluates the overall meeting and every functionary role." },
]

export const ROLE_KEYS = ROLES.map((r) => r.key)

export const VOTE_CATEGORIES: { key: string; label: string; description: string; roleFilter: string | null }[] = [
  { key: "best_speaker", label: "Best Speaker", description: "Who delivered the best prepared speech?", roleFilter: "speaker" },
  { key: "best_evaluator", label: "Best Evaluator", description: "Who gave the most helpful evaluation?", roleFilter: "evaluator" },
  { key: "best_table_topics", label: "Best Table Topics Speaker", description: "Who shone in the impromptu speaking segment?", roleFilter: null },
  { key: "best_role_player", label: "Best Role Player", description: "Who played a functionary role (TMOD, Timer, Grammarian, etc.) best?", roleFilter: null },
]

export const VOTE_CATEGORY_KEYS = VOTE_CATEGORIES.map((c) => c.key)

export const MEETING_STATUSES = ["scheduled", "completed", "closed"] as const
export type MeetingStatus = (typeof MEETING_STATUSES)[number]

export const ATTENDANCE_STATUSES = ["yes", "no", "maybe"] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export function roleLabel(key: string): string {
  return ROLES.find((r) => r.key === key)?.label ?? key
}

export function roleShort(key: string): string {
  return ROLES.find((r) => r.key === key)?.short ?? key
}

export function isMultiRole(key: string): boolean {
  return ROLES.find((r) => r.key === key)?.multi ?? false
}
