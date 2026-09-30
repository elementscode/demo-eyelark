import { NotFoundError, ValidationError, sql, tx } from "@elements/app";
import { requireStaff } from "#app/shared/services/auth";
import { isValidDate, loadDoctors, scheduleChannel } from "#app/shared/services/schedule";
import { AppointmentStatus, AppointmentType, Doctor, PRACTICE, localDate } from "#app/shared/practice";

export interface DeskAppointment {
  id: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  phone: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startsAt: Date;
  endsAt: Date;
  checkedInAt: Date | null;
  completedAt: Date | null;
  intakeDone: boolean;
  firstVisit: boolean;
}

export interface DeskDay {
  date: string;
  doctors: Doctor[];
  appointments: DeskAppointment[];
}

export function readDay(date: string): DeskDay {
  let tz = PRACTICE.timeZone;

  let appointments = sql<DeskAppointment>(`
    select a.id, a.doctorId, a.patientId, a.type, a.status, a.startsAt, a.endsAt,
           a.checkedInAt, a.completedAt,
           p.firstName || ' ' || p.lastName as patientName,
           p.phone,
           exists (select 1 from intakes i where i.appointmentId = a.id) as intakeDone,
           not exists (
             select 1 from appointments earlier
              where earlier.patientId = a.patientId
                and earlier.status = 'completed'
                and earlier.startsAt < a.startsAt
           ) as firstVisit
      from appointments a
      join patients p on p.id = a.patientId
     where (a.startsAt at time zone ${tz})::date = ${date}::date
     order by a.startsAt, a.createdAt
  `).all();

  return { date, doctors: loadDoctors(), appointments };
}

/** @rpc */
export function loadDay(date: string): DeskDay {
  requireStaff();

  if (!isValidDate(date)) {
    throw new ValidationError("Choose a valid date.");
  }

  return readDay(date);
}

/** Locks a visit and checks it is still in a state the action applies to. */
function lockVisit(id: string, from: AppointmentStatus[]): string {
  requireStaff();

  let row = sql<{ startsAt: Date; status: AppointmentStatus }>(`
    select startsAt, status from appointments where id = ${id} for update
  `).first();

  if (!row) {
    throw new NotFoundError("That appointment no longer exists.");
  }

  if (!from.includes(row.status)) {
    throw new ValidationError("Someone else already updated this visit.");
  }

  return localDate(row.startsAt);
}

function announce(day: string): DeskDay {
  scheduleChannel.notify({ day });

  return readDay(day);
}

/** @rpc */
export function checkIn(id: string): DeskDay {
  let day = tx(() => {
    let day = lockVisit(id, ["booked"]);
    sql(`update appointments set status = 'checkedIn', checkedInAt = now() where id = ${id}`);

    return day;
  });

  return announce(day);
}

/**
 * Completing a comprehensive exam sets the patient's next recall a year from
 * the visit and clears any notice sent for the old one.
 *
 * @rpc
 */
export function completeVisit(id: string): DeskDay {
  let day = tx(() => {
    let day = lockVisit(id, ["checkedIn", "booked"]);

    let visit = sql<{ patientId: string; type: AppointmentType }>(`
      update appointments
         set status = 'completed',
             completedAt = now(),
             checkedInAt = coalesce(checkedInAt, now())
       where id = ${id}
      returning patientId, type
    `).firstOrThrow("appointment update returned no row");

    if (visit.type === "exam") {
      sql(`
        update patients
           set recallDate = (${day}::date + interval '1 year')::date,
               recallNoticeSentAt = null
         where id = ${visit.patientId}
      `);
    }

    return day;
  });

  return announce(day);
}

/** @rpc */
export function undoCheckIn(id: string): DeskDay {
  let day = tx(() => {
    let day = lockVisit(id, ["checkedIn"]);
    sql(`update appointments set status = 'booked', checkedInAt = null where id = ${id}`);

    return day;
  });

  return announce(day);
}
