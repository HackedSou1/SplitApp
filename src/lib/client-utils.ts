export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("")
}

const AVATAR_CLASSES = [
  "bg-emerald-700 text-emerald-50",
  "bg-amber-600 text-amber-50",
  "bg-rose-700 text-rose-50",
  "bg-teal-700 text-teal-50",
  "bg-orange-700 text-orange-50",
  "bg-cyan-800 text-cyan-50",
  "bg-lime-700 text-lime-50",
  "bg-red-800 text-red-50",
]

export function avatarClass(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_CLASSES[h % AVATAR_CLASSES.length]!
}

export function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })
}

export function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

export function fmtShortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function relDayLabel(iso: string): string {
  const now = new Date()
  const d = new Date(iso)
  const days = Math.round((d.getTime() - now.getTime()) / 86400000)
  if (days === 0) return "today"
  if (days === 1) return "tomorrow"
  if (days === -1) return "yesterday"
  if (days > 1) return `in ${days} days`
  return `${-days} days ago`
}

export async function api(path: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown): Promise<unknown> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    // non-json response
  }
  if (!res.ok) {
    const message =
      json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
        ? (json as { error: string }).error
        : "Something went wrong. Please try again."
    throw new Error(message)
  }
  return json
}

export function localInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
