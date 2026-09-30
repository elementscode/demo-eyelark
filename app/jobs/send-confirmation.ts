import { Job, email } from "@elements/app";
import ConfirmationEmail from "#app/emails/confirmation";
import { findVisitById } from "#app/shared/services/visits";
import { PRACTICE, formatDateTime } from "#app/shared/practice";

export interface SendConfirmationJobFields {
  appointmentId: string;
  kind: "booked" | "rescheduled";
}

/**
 * Emails the patient the details of a visit they just booked or moved.
 */
export class SendConfirmationJob extends Job<SendConfirmationJobFields> {
  static maxAttempts = 5;

  run() {
    let visit = findVisitById(this.fields.appointmentId);
    if (!visit || visit.status === "cancelled") {
      return;
    }

    let rescheduled = this.fields.kind === "rescheduled";
    let subject = rescheduled
      ? `Your visit has moved to ${formatDateTime(visit.startsAt)}`
      : `You're booked: ${formatDateTime(visit.startsAt)}`;

    email({
      to: visit.email,
      subject: `${subject} · ${PRACTICE.name}`,
      body: new ConfirmationEmail({ visit, rescheduled }),
    });
  }
}
