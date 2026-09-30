import { session, sql } from "@elements/app";
import { PRACTICE, addDays, isWeekend, localDate } from "#app/shared/practice";

/**
 * Rows for tests. The test database gets no development seed, so each test
 * builds the practice it needs inside its own rolled-back transaction.
 */
export interface Practice {
  raman: string;
  okafor: string;
  staffId: string;
}

export function seedPractice(): Practice {
  let doctors = sql<{ id: string }>(`
    insert into doctors (name, position)
         values ('Dr. Test Raman', 1), ('Dr. Test Okafor', 2)
    returning id
  `).all();

  // A cheap hash: tests sign in through the session, not the password.
  let staff = sql<{ id: string }>(`
    insert into staff (name, email, passwordHash)
         values ('Test Desk', 'desk@eyelark.test', crypt('secret-pass', genSalt('bf', 4)))
    returning id
  `).firstOrThrow();

  return { raman: doctors[0].id, okafor: doctors[1].id, staffId: staff.id };
}

export function signInStaff(practice: Practice) {
  session.login({ userId: practice.staffId, userName: "Test Desk" });
}

export function seedPatient(email = "pat@example.com", recallDate: string | null = null): string {
  return sql<{ id: string }>(`
    insert into patients (firstName, lastName, email, phone, recallDate)
         values ('Pat', 'Example', ${email}, '(503) 555-0100', ${recallDate}::date)
    returning id
  `).firstOrThrow().id;
}

/** A weekday at least `ahead` days out, so every slot on it is in the future. */
export function futureWeekday(ahead = 3): string {
  let date = addDays(localDate(), ahead);

  while (isWeekend(date)) {
    date = addDays(date, 1);
  }

  return date;
}

/** The instant a practice-local clock time falls on. */
export function at(date: string, clock: string): Date {
  return sql<{ t: Date }>(`
    select (${date}::date + ${clock}::time) at time zone ${PRACTICE.timeZone} as t
  `).firstOrThrow().t;
}

export function seedAppointment(
  patientId: string,
  doctorId: string,
  startsAt: Date,
  type = "exam",
  status = "booked",
): { id: string; token: string } {
  let minutes = type === "followup" ? 30 : 60;

  return sql<{ id: string; token: string }>(`
    insert into appointments (patientId, doctorId, type, status, startsAt, endsAt)
         values (${patientId}, ${doctorId}, ${type}, ${status}, ${startsAt},
                 ${startsAt}::timestamptz + make_interval(mins => ${minutes}))
    returning id, token
  `).firstOrThrow();
}
