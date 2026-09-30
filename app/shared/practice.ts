/**
 * Facts about the practice and the shapes shared by the patient and front
 * desk pages. Nothing here touches the database, so it is safe in the browser.
 */

export const PRACTICE = {
  name: "Eyelark Eye Care",
  phone: "(503) 555-0142",
  address: "2210 NE Alberta St, Portland, OR",
  timeZone: "America/Los_Angeles",
};

export type AppointmentType = "exam" | "fitting" | "followup";
export type AppointmentStatus = "booked" | "checkedIn" | "completed" | "cancelled";

export interface VisitType {
  id: AppointmentType;
  label: string;
  minutes: number;
  blurb: string;
}

export const VISIT_TYPES: VisitType[] = [
  {
    id: "exam",
    label: "Comprehensive exam",
    minutes: 60,
    blurb: "Vision, eye health and a new prescription. Once a year for most people.",
  },
  {
    id: "fitting",
    label: "Contact lens fitting",
    minutes: 60,
    blurb: "Measurements, trial lenses and a contact lens prescription.",
  },
  {
    id: "followup",
    label: "Follow-up",
    minutes: 30,
    blurb: "A check on a recent visit, a new lens, or a symptom we are watching.",
  },
];

export function visitType(id: AppointmentType): VisitType {
  return VISIT_TYPES.find((t) => t.id === id) ?? VISIT_TYPES[0];
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  booked: "Booked",
  checkedIn: "Checked in",
  completed: "Complete",
  cancelled: "Cancelled",
};

export interface Doctor {
  id: string;
  name: string;
  credentials: string;
  bio: string;
}

export interface Slot {
  startsAt: Date;
  doctorIds: string[];
}

/** The practice's calendar date for an instant, as YYYY-MM-DD. */
export function localDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PRACTICE.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Moves a YYYY-MM-DD date by whole days. */
export function addDays(date: string, days: number): string {
  let d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);
}

export function isWeekend(date: string): boolean {
  let day = new Date(`${date}T12:00:00Z`).getUTCDay();

  return day === 0 || day === 6;
}

export function formatTime(at: Date): string {
  return at.toLocaleTimeString("en-US", {
    timeZone: PRACTICE.timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateTime(at: Date): string {
  return at.toLocaleString("en-US", {
    timeZone: PRACTICE.timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatShortDate(at: Date): string {
  return at.toLocaleDateString("en-US", {
    timeZone: PRACTICE.timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Formats a YYYY-MM-DD calendar date without shifting it through a time zone. */
export function formatDay(date: string, style: "long" | "short" = "long"): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: style,
    month: style === "long" ? "long" : "short",
    day: "numeric",
  });
}

export function formatCalendarDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** One appointment as a patient sees it: on the visit page and in email. */
export interface VisitSummary {
  id: string;
  token: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startsAt: Date;
  endsAt: Date;
  doctorId: string;
  doctorName: string;
  firstName: string;
  lastName: string;
  email: string;
  intakeDone: boolean;
}
