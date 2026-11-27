import type { AppData, AppMeeting } from "@/lib/client-types"

// Builds the WhatsApp "role call" message in the club's usual format, with names filled in.
export function buildRoleCall(meeting: AppMeeting, data: AppData): string {
  const nameOf = (role: string, slot = 1) => {
    const r = meeting.roles.find((x) => x.role === role && x.slot === slot)
    return r ? (data.users.find((u) => u.id === r.userId)?.name ?? "") : ""
  }
  const d = new Date(meeting.date)
  const date = d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase()
  const venue = [meeting.venue, meeting.mapsUrl].filter(Boolean).join(" ")
  const slots = Array.from({ length: meeting.speakerSlots }, (_, i) => i + 1)

  const lines: string[] = [
    `Role call for ${meeting.number ? `#${meeting.number} ` : ""}meeting of 🏤 *${data.club.name}*`,
    "@all",
    `*Venue:* ${venue}`,
    "",
    `*📅 Date:* ${date}`,
    `*📜 Theme -* ${meeting.theme ?? ""}`,
    `*🕚 Time:* ${time}`,
    "",
    `*SAA:* ${nameOf("saa")}`,
    `*PO:* ${nameOf("presiding_officer")}`,
    "",
    "*Role Players*",
    "",
    `*👩🏻‍💼 TMoD* : ${nameOf("toastmaster")}`,
    `*GE* : ${nameOf("general_evaluator")}`,
    `*TTM* : ${nameOf("topicsmaster")}`,
    "",
    "*🔶 Speakers*",
    "",
    ...slots.map((n) => `🎤  ${n}. ${nameOf("speaker", n)}`),
    "",
    "",
    "*🔷 Evaluators*",
    "",
    ...slots.map((n) => `🎤 *${n}.* ${nameOf("evaluator", n)}`),
    "",
    "",
    "*TAG Team*",
    "",
    `⏱️ *Timer* - ${nameOf("timer")}`,
    `🗣️ *Ah counter* - ${nameOf("ah_counter")}`,
    `👨‍🏫 *Grammarian* - ${nameOf("grammarian")}`,
    `👂🏻 *Active Listener* - ${nameOf("active_listener")}`,
    "",
    `Backup speaker: ${nameOf("backup_speaker")}`,
  ]
  if (meeting.notes) lines.push("", meeting.notes)
  if (data.club.scriptUrl || data.club.guideUrl) lines.push("")
  if (data.club.scriptUrl) lines.push(`*Roles' Script:* ${data.club.scriptUrl}`)
  if (data.club.guideUrl) lines.push(`*Role Call Bible:* ${data.club.guideUrl}`)
  return lines.join("\n")
}
