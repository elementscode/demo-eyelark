import { Job, email, sql } from "@elements/app";
import RecallEmail from "#app/emails/recall";
import { PRACTICE, localDate } from "#app/shared/practice";

export const RECALL_LEAD_DAYS = 30;

interface RecallPatient {
  id: string;
  firstName: string;
  email: string;
  recallDate: string;
}

/**
 * Emails every patient whose recall falls in the next 30 days, skipping
 * anyone who already has an exam booked or was sent a notice this month.
 */
export class SendRecallNoticesJob extends Job {
  run() {
    let today = localDate();

    let due = sql<RecallPatient>(`
      select p.id, p.firstName, p.email, p.recallDate::text as recallDate
        from patients p
       where p.recallDate <= ${today}::date + ${RECALL_LEAD_DAYS}::int
         and (p.recallNoticeSentAt is null or p.recallNoticeSentAt < now() - interval '30 days')
         and not exists (
               select 1 from appointments a
                where a.patientId = p.id
                  and a.type = 'exam'
                  and a.status in ('booked', 'checkedIn')
                  and a.startsAt > now()
             )
       order by p.recallDate
    `).all();

    for (let patient of due) {
      sql(`update patients set recallNoticeSentAt = now() where id = ${patient.id}`);

      email({
        to: patient.email,
        subject: `Your yearly eye exam is due · ${PRACTICE.name}`,
        body: new RecallEmail({
          firstName: patient.firstName,
          recallDate: patient.recallDate,
          bookUrl: `/book?type=exam&email=${encodeURIComponent(patient.email)}`,
        }),
      });
    }
  }
}
