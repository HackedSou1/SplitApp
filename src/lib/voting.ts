import { VOTE_CATEGORIES } from "@/lib/constants"
import type { AppMeeting, AppUser } from "@/lib/client-types"

// Suggested nominees when the admin hasn't picked any: role holders for the award,
// otherwise everyone who attended. Table Topics excludes the Table Topics Master.
export function defaultNominees(m: AppMeeting, category: string, users: AppUser[]): string[] {
  const active = new Set(users.filter((u) => u.active).map((u) => u.id))
  const attendees = Array.from(
    new Set([...m.attendances.filter((a) => a.status === "yes").map((a) => a.userId), ...m.roles.map((r) => r.userId)])
  )
  const cat = VOTE_CATEGORIES.find((c) => c.key === category)
  let ids = attendees
  if (cat?.roles) {
    const holders = Array.from(new Set(m.roles.filter((r) => cat.roles!.includes(r.role)).map((r) => r.userId)))
    if (holders.length > 0) ids = holders
  }
  if (category === "best_table_topics") {
    const ttm = m.roles.find((r) => r.role === "topicsmaster")?.userId
    const withoutTtm = ids.filter((id) => id !== ttm)
    if (withoutTtm.length > 0) ids = withoutTtm
  }
  return ids.filter((id) => active.has(id))
}

/** Who can be voted for: the admin's nominations if set, otherwise the defaults. */
export function candidatesFor(m: AppMeeting, category: string, users: AppUser[]): string[] {
  const picked = m.nominations?.[category]
  const ids = picked && picked.length > 0 ? picked : defaultNominees(m, category, users)
  const byId = new Map(users.map((u) => [u.id, u]))
  return ids
    .filter((id) => byId.get(id)?.active)
    .sort((a, b) => byId.get(a)!.name.localeCompare(byId.get(b)!.name))
}
