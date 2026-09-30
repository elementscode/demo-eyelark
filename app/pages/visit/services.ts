import { ForbiddenError, NotFoundError, sql, tx } from "@elements/app";
import { SendConfirmationJob } from "#app/jobs/send-confirmation";
import { claimSlot, scheduleChannel } from "#app/shared/services/schedule";
import { findVisitByToken } from "#app/shared/services/visits";
import { VisitSummary, localDate, visitType } from "#app/shared/practice";

/** A visit the patient may still change: booked and not yet started. */
function changeableVisit(token: string): VisitSummary {
  let visit = findVisitByToken(token);
  if (!visit) {
    throw new NotFoundError("We couldn't find that visit.");
  }

  if (visit.status !== "booked" || visit.startsAt.getTime() <= Date.now()) {
    throw new ForbiddenError("This visit can no longer be changed online. Please call us.");
  }

  return visit;
}

/** @rpc */
export function rescheduleVisit(token: string, startsAt: Date, doctorId: string): VisitSummary {
  let visit = changeableVisit(token);
  let minutes = visitType(visit.type).minutes;

  tx(() => {
    let assigned = claimSlot(startsAt, visit.type, doctorId || null, visit.id);

    sql(`
      update appointments
         set startsAt = ${startsAt},
             endsAt = ${startsAt}::timestamptz + make_interval(mins => ${minutes}),
             doctorId = ${assigned},
             reminderSentAt = null
       where id = ${visit.id}
    `);

    new SendConfirmationJob({ appointmentId: visit.id, kind: "rescheduled" }).schedule();
  });

  scheduleChannel.notify({ day: localDate(visit.startsAt) });
  scheduleChannel.notify({ day: localDate(startsAt) });

  return findVisitByToken(token)!;
}

/** @rpc */
export function cancelVisit(token: string): VisitSummary {
  let visit = changeableVisit(token);

  sql(`update appointments set status = 'cancelled', cancelledAt = now() where id = ${visit.id}`);
  scheduleChannel.notify({ day: localDate(visit.startsAt) });

  return findVisitByToken(token)!;
}
