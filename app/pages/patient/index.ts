import { NotFoundError, Request, Response, sql } from "@elements/app";
import { requireStaffOrRedirect } from "#app/shared/services/auth";
import { localDate } from "#app/shared/practice";
import html, { PatientRecord, PatientVisit } from "./template";

export default function route(req: Request, res: Response) {
  if (!requireStaffOrRedirect()) {
    return;
  }

  let patient = sql<PatientRecord>(`
    select id, firstName, lastName, email, phone,
           coalesce((select min(a.startsAt) from appointments a where a.patientId = patients.id), createdAt) as createdAt,
           birthDate::text as birthDate,
           recallDate::text as recallDate,
           recallNoticeSentAt
      from patients
     where id = ${String(req.params.id)}::uuid
  `).first();

  if (!patient) {
    throw new NotFoundError("patient not found");
  }

  let visits = sql<PatientVisit>(`
    select a.id, a.type, a.status, a.startsAt, d.name as doctorName,
           exists (select 1 from intakes i where i.appointmentId = a.id) as intakeDone
      from appointments a
      join doctors d on d.id = a.doctorId
     where a.patientId = ${patient.id}
     order by a.startsAt desc
  `).all();

  return new html({ patient, visits, today: localDate() });
}
