import { test, assert, equal, sql, AuthError, ValidationError } from "@elements/app";
import { at, futureWeekday, seedAppointment, seedPatient, seedPractice, signInStaff } from "#app/shared/fixtures";
import { DeskAppointment, DeskDay, checkIn, completeVisit, loadDay, undoCheckIn } from "./services";

/** The test's own visit in a day view that also carries the practice's other visits. */
function visitIn(day: DeskDay, id: string): DeskAppointment {
  let found = day.appointments.find((a) => a.id === id);
  assert(found !== undefined, `visit ${id} is missing from ${day.date}`);

  return found!;
}

test("desk", () => {
  test("the day view needs a staff session", () => {
    seedPractice();

    let threw = false;
    try {
      loadDay(futureWeekday());
    } catch (err) {
      threw = true;
      assert(err instanceof AuthError, `got ${err}`);
    }

    assert(threw);
  });

  test("lists the day's visits with intake status", () => {
    let practice = seedPractice();
    signInStaff(practice);
    let date = futureWeekday();
    let patient = seedPatient();
    let visit = seedAppointment(patient, practice.okafor, at(date, "13:00"), "fitting");
    sql(`insert into intakes (appointmentId, insuranceProvider, symptoms, medications) values (${visit.id}, 'Cascade Vision Plan', 'None', 'None')`);
    let other = seedAppointment(seedPatient("other@example.com"), practice.raman, at(date, "09:00"));

    let day = loadDay(date);
    let doctors = day.doctors.filter((d) => d.id === practice.raman || d.id === practice.okafor);
    let visits = day.appointments.filter((a) => a.id === visit.id || a.id === other.id);

    equal(doctors.map((d) => d.id), [practice.raman, practice.okafor]);
    equal(visits.length, 2);
    equal(visits[0].id, other.id, "the 9:00 visit comes first");
    equal(visits[0].patientName, "Pat Example");
    equal(visits[1].intakeDone, true);
    equal(visits[1].firstVisit, true);
  });

  test("check in, then complete an exam, sets the recall a year out", () => {
    let practice = seedPractice();
    signInStaff(practice);
    let date = futureWeekday();
    let patient = seedPatient();
    let visit = seedAppointment(patient, practice.raman, at(date, "09:00"));

    let day = checkIn(visit.id);
    equal(visitIn(day, visit.id).status, "checkedIn");
    assert(visitIn(day, visit.id).checkedInAt !== null);

    day = completeVisit(visit.id);
    equal(visitIn(day, visit.id).status, "completed");

    // A year out by the calendar's rules, so a Feb 29 visit day still matches.
    let row = sql<{ recallDate: string; expected: string }>(`
      select recallDate::text as recallDate, (${date}::date + interval '1 year')::date::text as expected
        from patients where id = ${patient}
    `).firstOrThrow();
    equal(row.recallDate, row.expected);
  });

  test("a completed follow-up leaves the recall alone", () => {
    let practice = seedPractice();
    signInStaff(practice);
    let patient = seedPatient("pat@example.com", "2027-03-01");
    let visit = seedAppointment(patient, practice.raman, at(futureWeekday(), "09:00"), "followup", "checkedIn");

    completeVisit(visit.id);

    let row = sql<{ recallDate: string }>(`select recallDate::text as recallDate from patients where id = ${patient}`).firstOrThrow();
    equal(row.recallDate, "2027-03-01");
  });

  test("undo returns a checked-in visit to booked, and a second check-in is refused", () => {
    let practice = seedPractice();
    signInStaff(practice);
    let visit = seedAppointment(seedPatient(), practice.raman, at(futureWeekday(), "09:00"));

    checkIn(visit.id);
    let day = undoCheckIn(visit.id);
    equal(visitIn(day, visit.id).status, "booked");
    equal(visitIn(day, visit.id).checkedInAt, null);

    checkIn(visit.id);

    let threw = false;
    try {
      checkIn(visit.id);
    } catch (err) {
      threw = true;
      assert(err instanceof ValidationError, `got ${err}`);
    }

    assert(threw);
  });
});
