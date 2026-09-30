import { Job, email, sql } from "@elements/app";
import ReminderEmail from "#app/emails/reminder";
import { findVisitById } from "#app/shared/services/visits";
import { PRACTICE, formatTime } from "#app/shared/practice";

/**
 * Emails a reminder for every booked visit starting in the next 24 hours
 * that has not had one. Claiming the row before sending means two runs never
 * remind the same visit twice.
 */
export class SendRemindersJob extends Job {
  run() {
    let due = sql<{ id: string }>(`
      select id
        from appointments
       where status = 'booked'
         and reminderSentAt is null
         and startsAt between now() and now() + interval '24 hours'
       order by startsAt
    `).all();

    for (let row of due) {
      let claimed = sql(`
        update appointments
           set reminderSentAt = now()
         where id = ${row.id} and reminderSentAt is null
        returning id
      `).all();

      let visit = findVisitById(row.id);
      if (claimed.length === 0 || !visit) {
        continue;
      }

      email({
        to: visit.email,
        subject: `Reminder: your eye appointment at ${formatTime(visit.startsAt)} · ${PRACTICE.name}`,
        body: new ReminderEmail({ visit }),
      });
    }
  }
}
