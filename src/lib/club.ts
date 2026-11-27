import { db } from "@/lib/db"

const DEFAULTS = {
  name: "Step Up Dwarka Toastmasters Club",
  venue: "Creative unlock Ramphal chowk, dwarka sector 7",
  mapsUrl: "https://maps.app.goo.gl/Kwu8Bkyyyn996jW27",
  meetingTime: "10:45",
  scriptUrl: "https://bit.ly/meetingScript",
  guideUrl: "https://www.toastmasters.org/membership/club-meeting-roles",
}

export async function getClub() {
  let club = await db.club.findUnique({ where: { id: 1 } })
  if (!club) {
    try {
      club = await db.club.create({ data: { id: 1, ...DEFAULTS } })
    } catch {
      club = await db.club.findUniqueOrThrow({ where: { id: 1 } }) // created by a parallel request
    }
  }
  return {
    name: club.name,
    venue: club.venue,
    mapsUrl: club.mapsUrl,
    meetingTime: club.meetingTime,
    scriptUrl: club.scriptUrl,
    guideUrl: club.guideUrl,
  }
}
