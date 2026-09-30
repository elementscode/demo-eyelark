import { ForbiddenError, NotFoundError, ValidationError, sql } from "@elements/app";
import { findVisitByToken } from "#app/shared/services/visits";
import { scheduleChannel } from "#app/shared/services/schedule";
import { localDate } from "#app/shared/practice";

export type Eyewear = "none" | "glasses" | "contacts" | "both";

export interface IntakeForm {
  insuranceProvider: string;
  insuranceMemberId: string;
  eyewear: Eyewear;
  eyewearNotes: string;
  symptoms: string;
  medications: string;
}

export function emptyIntake(): IntakeForm {
  return {
    insuranceProvider: "",
    insuranceMemberId: "",
    eyewear: "glasses",
    eyewearNotes: "",
    symptoms: "",
    medications: "",
  };
}

export function loadIntake(appointmentId: string): IntakeForm | undefined {
  return sql<IntakeForm>(`
    select insuranceProvider, insuranceMemberId, eyewear, eyewearNotes, symptoms, medications
      from intakes
     where appointmentId = ${appointmentId}
  `).first();
}

export function checkIntake(form: IntakeForm): Record<string, string[]> {
  let errors: Record<string, string[]> = {};

  if (!form.insuranceProvider.trim()) {
    errors.insuranceProvider = ["Enter your vision plan, or \"Self-pay\"."];
  }

  if (!["none", "glasses", "contacts", "both"].includes(form.eyewear)) {
    errors.eyewear = ["Choose what you wear now."];
  }

  if (!form.symptoms.trim()) {
    errors.symptoms = ["Tell us what's going on, or write \"None\"."];
  }

  if (!form.medications.trim()) {
    errors.medications = ["List your medications, or write \"None\"."];
  }

  return errors;
}

/** @rpc */
export function saveIntake(token: string, form: IntakeForm) {
  let visit = findVisitByToken(token);
  if (!visit) {
    throw new NotFoundError("We couldn't find that visit.");
  }

  if (visit.status === "cancelled" || visit.status === "completed") {
    throw new ForbiddenError("This visit is closed, so its intake can't be changed.");
  }

  let errors = checkIntake(form);
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  sql(`
    insert into intakes (appointmentId, insuranceProvider, insuranceMemberId, eyewear, eyewearNotes, symptoms, medications)
         values (${visit.id}, ${form.insuranceProvider.trim()}, ${form.insuranceMemberId.trim()}, ${form.eyewear},
                 ${form.eyewearNotes.trim()}, ${form.symptoms.trim()}, ${form.medications.trim()})
    on conflict (appointmentId) do update
       set insuranceProvider = excluded.insuranceProvider,
           insuranceMemberId = excluded.insuranceMemberId,
           eyewear = excluded.eyewear,
           eyewearNotes = excluded.eyewearNotes,
           symptoms = excluded.symptoms,
           medications = excluded.medications
  `);

  scheduleChannel.notify({ day: localDate(visit.startsAt) });
}
