import { DateTime } from "luxon";
import type { DayWindow } from "@/lib/appointment-scheduling";
import {
  overlaps,
  SCHED_DEFAULT_SLOT_MINUTES,
  SCHED_MAX_HORIZON_DAYS,
  SCHED_MIN_NOTICE_HOURS,
} from "@/lib/appointment-scheduling";

/** US Eastern for seller windows and buyer-facing slots (handles EST/EDT). */
export const SCHED_ZONE = "America/New_York";

export function easternNowStartOfDay(): DateTime {
  return DateTime.now().setZone(SCHED_ZONE).startOf("day");
}

/** Parse YYYY-MM-DD as a calendar date in America/New_York. */
export function parseEasternDateOnly(dateStr: string): DateTime {
  const dt = DateTime.fromISO(dateStr, { zone: SCHED_ZONE });
  if (!dt.isValid) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return dt.startOf("day");
}

/** Eastern calendar date string for an instant (UTC stored). */
export function easternDateStringFromUtc(jsDate: Date): string {
  return DateTime.fromJSDate(jsDate).setZone(SCHED_ZONE).toFormat("yyyy-MM-dd");
}

export function eachEasternDateInclusive(fromYmd: string, toYmd: string): string[] {
  let cur = parseEasternDateOnly(fromYmd);
  const end = parseEasternDateOnly(toYmd);
  const out: string[] = [];
  while (cur <= end) {
    out.push(cur.toFormat("yyyy-MM-dd"));
    cur = cur.plus({ days: 1 });
  }
  return out;
}

/**
 * Monday 00:00 Eastern of the week containing `dt` (Luxon weekday: Mon=1 … Sun=7).
 */
export function startOfWeekMondayEastern(dt: DateTime): DateTime {
  const d = dt.setZone(SCHED_ZONE).startOf("day");
  const daysSinceMon = d.weekday === 7 ? 6 : d.weekday - 1;
  return d.minus({ days: daysSinceMon });
}

/**
 * Slots on one Eastern calendar day. Windows use weekday + minutes from midnight Eastern.
 * Weekday: JS convention Sun=0 … Sat=6 (matches seller UI).
 */
export function generateSlotsForEasternDate(
  easternYmd: string,
  windows: DayWindow[],
  bookings: { start: Date; end: Date }[],
  now: Date,
  opts?: { minNoticeMs?: number }
): { start: Date; end: Date }[] {
  const minNoticeMs = opts?.minNoticeMs ?? SCHED_MIN_NOTICE_HOURS * 3600000;
  const minBookable = new Date(now.getTime() + minNoticeMs);

  const dtStart = parseEasternDateOnly(easternYmd);
  const jsWeekday = dtStart.weekday === 7 ? 0 : dtStart.weekday;

  const rules = windows.filter((w) => w.weekday === jsWeekday);
  const slots: { start: Date; end: Date }[] = [];

  for (const w of rules) {
    const slotLen = Math.max(
      5,
      Math.min(240, w.slotMinutes || SCHED_DEFAULT_SLOT_MINUTES)
    );
    const endCap = Math.min(w.endMinute, 24 * 60);
    for (let m = w.startMinute; m + slotLen <= endCap; m += slotLen) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const startLux = dtStart.set({
        hour: h,
        minute: min,
        second: 0,
        millisecond: 0,
      });
      const endLux = startLux.plus({ minutes: slotLen });
      const start = startLux.toUTC().toJSDate();
      const end = endLux.toUTC().toJSDate();
      if (start < minBookable) continue;
      if (bookings.some((b) => overlaps(start, end, b.start, b.end))) continue;
      slots.push({ start, end });
    }
  }
  return slots;
}

export { SCHED_MAX_HORIZON_DAYS };
