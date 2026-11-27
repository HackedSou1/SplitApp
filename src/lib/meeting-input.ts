import { ApiError } from "@/lib/auth"
import { MAX_SLOTS } from "@/lib/constants"

type MeetingFields = {
  title?: string
  number?: number | null
  theme?: string | null
  date?: Date
  venue?: string | null
  mapsUrl?: string | null
  speakerSlots?: number
  notes?: string | null
}

const optText = (v: unknown) => (String(v ?? "").trim() || null)

// Reads the editable meeting fields from a request body (only the ones present).
export function parseMeetingFields(body: Record<string, unknown>): MeetingFields {
  const data: MeetingFields = {}
  if (body.title !== undefined) {
    const title = String(body.title).trim()
    if (!title) throw new ApiError("Title is required")
    data.title = title
  }
  if (body.number !== undefined) {
    const raw = String(body.number ?? "").trim()
    if (raw === "") data.number = null
    else {
      const n = Number(raw)
      if (!Number.isInteger(n) || n < 1) throw new ApiError("Meeting number must be a positive whole number")
      data.number = n
    }
  }
  if (body.theme !== undefined) data.theme = optText(body.theme)
  if (body.date !== undefined) {
    const date = new Date(String(body.date))
    if (isNaN(date.getTime())) throw new ApiError("A valid date is required")
    data.date = date
  }
  if (body.venue !== undefined) data.venue = optText(body.venue)
  if (body.mapsUrl !== undefined) {
    const url = optText(body.mapsUrl)
    if (url && !/^https?:\/\//i.test(url)) throw new ApiError("The Google Maps link must start with https://")
    data.mapsUrl = url
  }
  if (body.speakerSlots !== undefined) {
    const n = Number(body.speakerSlots)
    if (!Number.isInteger(n) || n < 1 || n > MAX_SLOTS) throw new ApiError(`Speakers must be between 1 and ${MAX_SLOTS}`)
    data.speakerSlots = n
  }
  if (body.notes !== undefined) data.notes = optText(body.notes)
  return data
}
