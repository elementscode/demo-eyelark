import { sql } from "@elements/app";
import { localDate } from "#app/shared/practice";

export const RECALL_WINDOW_DAYS = 30;

export interface PatientRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  lastVisit: Date | null;
  nextVisit: Date | null;
  recallDate: string | null;
}

export type RecallState = "overdue" | "due" | "later" | "none";

export function recallState(recallDate: string | null, today: string): RecallState {
  if (!recallDate) {
    return "none";
  }

  if (recallDate < today) {
    return "overdue";
  }

  let soon = new Date(`${today}T12:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + RECALL_WINDOW_DAYS);

  return recallDate <= soon.toISOString().slice(0, 10) ? "due" : "later";
}

export function findPatients(query: string, filter: "all" | "recall"): PatientRow[] {
  let pattern = `%${query.trim()}%`;
  let today = localDate();

  return sql<PatientRow>(`
    select p.id, p.firstName, p.lastName, p.email, p.phone,
           p.recallDate::text as recallDate,
           (select max(a.startsAt) from appointments a
             where a.patientId = p.id and a.status = 'completed') as lastVisit,
           (select min(a.startsAt) from appointments a
             where a.patientId = p.id and a.status in ('booked', 'checkedIn') and a.startsAt > now()) as nextVisit
      from patients p
     where (p.firstName || ' ' || p.lastName ilike ${pattern} or p.email ilike ${pattern} or p.phone ilike ${pattern})
       and (${filter} = 'all' or p.recallDate <= ${today}::date + ${RECALL_WINDOW_DAYS}::int)
     order by case when ${filter} = 'recall' then p.recallDate end, p.lastName, p.firstName
     limit 200
  `).all();
}
