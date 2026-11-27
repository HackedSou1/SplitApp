-- Runs before `prisma db push` on every deploy. Safe to run repeatedly.
DO $$
BEGIN
  -- 1. Remove the sample (demo) members and meetings that came with the app.
  IF to_regclass('public."Meeting"') IS NOT NULL THEN
    DELETE FROM "Meeting" WHERE title IN (
      'Meeting #12 — The Power of Storytelling',
      'Meeting #13 — Leadership in Action',
      'Meeting #14 — New Horizons'
    );
  END IF;
  IF to_regclass('public."User"') IS NOT NULL THEN
    DELETE FROM "User" WHERE email IN (
      'sarah@club.com','james@club.com','priya@club.com','michael@club.com',
      'emily@club.com','david@club.com','aisha@club.com','tom@club.com'
    );
  END IF;

  -- 2. First time only: add the "slot" column and number existing multi-person roles 1, 2, 3...
  IF to_regclass('public."MeetingRole"') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'MeetingRole' AND column_name = 'slot'
  ) THEN
    ALTER TABLE "MeetingRole" ADD COLUMN "slot" INTEGER NOT NULL DEFAULT 1;
    UPDATE "MeetingRole" mr SET "slot" = r.rn
    FROM (SELECT id, row_number() OVER (PARTITION BY "meetingId", role ORDER BY id) AS rn FROM "MeetingRole") r
    WHERE mr.id = r.id;
  END IF;
END $$;
