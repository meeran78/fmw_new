import type { DayWindow } from "@/lib/appointment-scheduling";

/**
 * Appwrite seller_schedule collection uses attribute `slotMinute` (singular).
 * Internal scheduling logic uses `slotMinutes`; map at the DB boundary.
 */
export const APPWRITE_SCHEDULE_SLOT_LENGTH_ATTR = "slotMinute" as const;

export function readScheduleSlotMinutesFromDoc(doc: unknown): number {
  if (!doc || typeof doc !== "object") return 30;
  const o = doc as Record<string, unknown>;
  const v = o.slotMinute ?? o.slotMinutes;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

/** Build a scheduling window from an Appwrite doc; skip invalid rows. */
export function dayWindowFromScheduleDoc(doc: unknown): DayWindow | null {
  if (!doc || typeof doc !== "object") return null;
  const o = doc as Record<string, unknown>;
  const weekday = Number(o.weekday);
  const startMinute = Number(o.startMinute);
  const endMinute = Number(o.endMinute);
  if (
    !Number.isFinite(weekday) ||
    weekday < 0 ||
    weekday > 6 ||
    !Number.isFinite(startMinute) ||
    !Number.isFinite(endMinute) ||
    startMinute < 0 ||
    endMinute <= startMinute ||
    startMinute > 24 * 60 ||
    endMinute > 24 * 60
  ) {
    return null;
  }
  return {
    weekday,
    startMinute,
    endMinute,
    slotMinutes: readScheduleSlotMinutesFromDoc(doc),
  };
}

export function scheduleRuleToAppwriteAttrs(rule: {
  weekday: number;
  startMinute: number;
  endMinute: number;
  slotMinutes: number;
}) {
  return {
    weekday: rule.weekday,
    startMinute: rule.startMinute,
    endMinute: rule.endMinute,
    [APPWRITE_SCHEDULE_SLOT_LENGTH_ATTR]: rule.slotMinutes,
  };
}
