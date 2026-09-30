import { Channel, sql, tx, ValidationError } from "@elements/app";
import { SendConfirmationJob } from "#app/jobs/send-confirmation";
import {
  AppointmentType,
  Doctor,
  PRACTICE,
  Slot,
  addDays,
  isWeekend,
  localDate,
  visitType,
} from "#app/shared/practice";

/**
 * Says "this day's schedule changed". The front desk re-reads the day it is
 * showing when one arrives, so bookings, check-ins and intakes land live.
 */
export const scheduleChannel = new Channel<{ day: string }>("schedule");

export const BOOKING_WINDOW_DAYS = 45;

export function loadDoctors(): Doctor[] {
  return sql<Doctor>(`
    select id, name, credentials, bio
      from doctors
     order by position
  `).all();
}

export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
}

/**
 * The open start times on one day for a visit type. Mornings run 9 to noon
 * and afternoons 1 to 5, and a visit may not run across lunch or past close.
 * With no doctor, a time is open when either doctor is free.
 */
export function findOpenSlots(
  date: string,
  type: AppointmentType,
  doctorId: string | null,
  ignoreAppointmentId: string | null = null,
): Slot[] {
  let today = localDate();

  if (!isValidDate(date) || isWeekend(date) || date < today || date > addDays(today, BOOKING_WINDOW_DAYS)) {
    return [];
  }

  let minutes = visitType(type).minutes;
  let tz = PRACTICE.timeZone;

  return sql<Slot>(`
    with candidates as (
      select (local at time zone ${tz}) as startsAt,
             ((local + make_interval(mins => ${minutes})) at time zone ${tz}) as endsAt,
             local::time as clock,
             (local + make_interval(mins => ${minutes}))::time as endClock
        from generateSeries(${date}::date + time '09:00', ${date}::date + time '16:30', interval '30 minutes') as local
    )
    select c.startsAt,
           array_agg(d.id order by d.position)::text[] as doctorIds
      from candidates c
      cross join doctors d
     where (${doctorId}::uuid is null or d.id = ${doctorId}::uuid)
       and c.startsAt > now() + interval '1 hour'
       and ((c.clock < time '12:00' and c.endClock <= time '12:00')
         or (c.clock >= time '13:00' and c.endClock <= time '17:00'))
       and not exists (
             select 1
               from appointments a
              where a.doctorId = d.id
                and a.status <> 'cancelled'
                and (${ignoreAppointmentId}::uuid is null or a.id <> ${ignoreAppointmentId}::uuid)
                and a.startsAt < c.endsAt
                and a.endsAt > c.startsAt
           )
     group by c.startsAt
     order by c.startsAt
  `).all();
}

/** @rpc */
export function openSlots(date: string, type: AppointmentType, doctorId: string): Slot[] {
  return findOpenSlots(date, type, doctorId || null);
}

/**
 * Takes a slot for a visit, choosing the first free doctor when none was
 * asked for. The doctor rows are locked first, so two people booking the same
 * time cannot both get it.
 */
export function claimSlot(
  startsAt: Date,
  type: AppointmentType,
  doctorId: string | null,
  ignoreAppointmentId: string | null = null,
): string {
  let day = localDate(startsAt);

  sql(`select id from doctors order by id for update`);

  let slot = findOpenSlots(day, type, doctorId, ignoreAppointmentId)
    .find((s) => s.startsAt.getTime() === startsAt.getTime());

  if (!slot) {
    throw new ValidationError("That time was just taken. Please choose another.");
  }

  return slot.doctorIds[0];
}

export interface BookingForm {
  type: AppointmentType;
  doctorId: string;
  startsAt: Date | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
}

function checkBooking(form: BookingForm) {
  let errors: Record<string, string[]> = {};

  if (!form.firstName.trim()) {
    errors.firstName = ["Enter your first name."];
  }

  if (!form.lastName.trim()) {
    errors.lastName = ["Enter your last name."];
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
    errors.email = ["Enter an email address we can send your confirmation to."];
  }

  if (form.phone.replace(/\D/g, "").length < 10) {
    errors.phone = ["Enter a phone number with area code."];
  }

  if (form.birthDate && !isValidDate(form.birthDate)) {
    errors.birthDate = ["Enter your date of birth."];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }
}

/** @rpc */
export function bookAppointment(form: BookingForm): string {
  if (!form.startsAt) {
    throw new ValidationError("Choose a time for your visit.");
  }

  checkBooking(form);

  let startsAt = form.startsAt;
  let minutes = visitType(form.type).minutes;
  let address = form.email.trim().toLowerCase();

  let token = tx(() => {
    let doctorId = claimSlot(startsAt, form.type, form.doctorId || null);

    let patient = sql<{ id: string }>(`
      insert into patients (firstName, lastName, email, phone, birthDate)
           values (${form.firstName.trim()}, ${form.lastName.trim()}, ${address}, ${form.phone.trim()}, ${form.birthDate || null}::date)
      on conflict (email) do update
         set firstName = excluded.firstName,
             lastName = excluded.lastName,
             phone = excluded.phone,
             birthDate = coalesce(excluded.birthDate, patients.birthDate)
      returning id
    `).firstOrThrow("patient upsert returned no row");

    let appointment = sql<{ id: string; token: string }>(`
      insert into appointments (patientId, doctorId, type, startsAt, endsAt)
           values (${patient.id}, ${doctorId}, ${form.type}, ${startsAt}, ${startsAt}::timestamptz + make_interval(mins => ${minutes}))
      returning id, token
    `).firstOrThrow("appointment insert returned no row");

    new SendConfirmationJob({ appointmentId: appointment.id, kind: "booked" }).schedule();

    return appointment.token;
  });

  scheduleChannel.notify({ day: localDate(startsAt) });

  return token;
}
