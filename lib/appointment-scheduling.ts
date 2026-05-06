/** Shared scheduling constants & overlap helpers. Wall-clock windows use US Eastern (see eastern-scheduling). */

export const SCHED_DEFAULT_SLOT_MINUTES = 30;
export const SCHED_MIN_NOTICE_HOURS = 2;
export const SCHED_MAX_HORIZON_DAYS = 60;

export const ACTIVE_APPOINTMENT_STATUSES = ["pending", "confirmed"] as const;

export type AppointmentStatus = (typeof ACTIVE_APPOINTMENT_STATUSES)[number] | "cancelled_buyer" | "cancelled_seller" | "completed";

export type DayWindow = {
  weekday: number;
  startMinute: number;
  endMinute: number;
  slotMinutes: number;
};

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function parseDateOnlyUTC(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Invalid date");
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDateOnlyUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Local calendar YYYY-MM-DD (matches `<input type="date" />` value). */
export function formatDateOnlyLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

export function addDaysUTC(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/** Roll local calendar date by `days` (DST-safe for date-only use). */
export function addDaysLocal(d: Date, days: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + days);
  return x;
}

/** Minutes since midnight from HH:mm (24h). */
export function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    throw new Error("Invalid time format (use HH:mm)");
  }
  return h * 60 + m;
}

export function minutesToTimeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Ensure proposed slot matches an allowed generated slot (millisecond tolerance). */
export function isSlotAllowed(
  start: Date,
  end: Date,
  allowed: { start: Date; end: Date }[]
): boolean {
  const tol = 2000;
  return allowed.some(
    (s) =>
      Math.abs(s.start.getTime() - start.getTime()) <= tol &&
      Math.abs(s.end.getTime() - end.getTime()) <= tol
  );
}
