import { sql } from "@elements/app";
import { VisitSummary } from "#app/shared/practice";

const visitColumns = () => sql.raw(`
  a.id, a.token, a.type, a.status, a.startsAt, a.endsAt, a.doctorId,
  d.name as doctorName, p.firstName, p.lastName, p.email,
  exists (select 1 from intakes i where i.appointmentId = a.id) as intakeDone
`);

export function findVisitById(id: string): VisitSummary | undefined {
  return sql<VisitSummary>(`
    select ${visitColumns()}
      from appointments a
      join doctors d on d.id = a.doctorId
      join patients p on p.id = a.patientId
     where a.id = ${id}
  `).first();
}

export function findVisitByToken(token: string): VisitSummary | undefined {
  return sql<VisitSummary>(`
    select ${visitColumns()}
      from appointments a
      join doctors d on d.id = a.doctorId
      join patients p on p.id = a.patientId
     where a.token = ${token}
  `).first();
}
