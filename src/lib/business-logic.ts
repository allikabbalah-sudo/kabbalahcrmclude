import { addDays, format, parse, setHours, setMinutes } from "date-fns";

/** Sunday=0 .. Saturday=6, matching Postgres extract(dow) and JS Date#getDay(). */
export type WeeklyDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface GenerateSessionsInput {
  startDate: Date;
  totalSessions: number;
  weeklyDays: WeeklyDay[];
  /** "HH:mm" 24h times, one per session-per-day, applied in order on each matching day */
  sessionTimes: string[];
}

/**
 * Expands a program's recurrence rule into concrete session datetimes.
 * Walks forward day-by-day from startDate, and on every date whose weekday
 * is in weeklyDays, emits one session per entry in sessionTimes — stopping
 * once totalSessions have been produced. Mirrors the Postgres trigger used
 * for postponement rescheduling (tg_session_postponed_reschedule), so the
 * client-side preview always matches what the DB will actually create.
 */
export function generateSessionDates({
  startDate,
  totalSessions,
  weeklyDays,
  sessionTimes,
}: GenerateSessionsInput): Date[] {
  if (weeklyDays.length === 0 || sessionTimes.length === 0 || totalSessions <= 0) {
    return [];
  }

  const daySet = new Set(weeklyDays);
  const out: Date[] = [];
  let cursor = startDate;
  let guard = 0; // hard stop so a bad rule can never infinite-loop

  while (out.length < totalSessions && guard < 3650) {
    if (daySet.has(cursor.getDay() as WeeklyDay)) {
      for (const time of sessionTimes) {
        if (out.length >= totalSessions) break;
        const parsed = parse(time, "HH:mm", cursor);
        out.push(setMinutes(setHours(cursor, parsed.getHours()), parsed.getMinutes()));
      }
    }
    cursor = addDays(cursor, 1);
    guard += 1;
  }

  return out;
}

/** Normalizes an Israeli-style local number ("05X-XXXXXXX", "0X-XXXXXXX") to E.164 (+972...). */
export function toE164Israel(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith("972")) return `+${digits}`;
  if (digits.startsWith("0")) return `+972${digits.slice(1)}`;
  return `+${digits}`;
}

/** Builds a wa.me deep link, optionally pre-filling a message. */
export function toWhatsAppUrl(rawPhone: string, message?: string): string {
  const e164 = toE164Israel(rawPhone).replace("+", "");
  const base = `https://wa.me/${e164}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Best-effort validity check used before allowing "Add member by email". */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function formatSessionDateHe(date: Date): string {
  return format(date, "dd/MM/yyyy HH:mm");
}

export const CLIENT_STATUS_LABELS_HE: Record<string, string> = {
  lead: "ליד",
  consultation: "ייעוץ",
  active: "פעיל",
  inactive: "לא פעיל",
  waiting: "בהמתנה",
  paid: "שילם",
};

export const TASK_PRIORITY_LABELS_HE: Record<string, string> = {
  low: "נמוכה",
  medium: "בינונית",
  high: "גבוהה",
  urgent: "דחוף",
};

export const WEEKDAY_LABELS_HE: Record<WeeklyDay, string> = {
  0: "א׳",
  1: "ב׳",
  2: "ג׳",
  3: "ד׳",
  4: "ה׳",
  5: "ו׳",
  6: "ש׳",
};
