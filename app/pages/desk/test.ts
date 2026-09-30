import { test, assert, equal, sql, AuthError, ValidationError } from "@elements/app";
import { at, futureWeekday, seedAppointment, seedPatient, seedPractice, signInStaff } from "#app/shared/fixtures";
import { checkIn, completeVisit, loadDay, undoCheckIn } from "./services";

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
    seedAppointment(seedPatient("other@example.com"), practice.raman, at(date, "09:00"));

    let day = loadDay(date);

    equal(day.doctors.length, 2);
    equal(day.appointments.length, 2);
    equal(day.appointments[0].patientName, "Pat Example");
    equal(day.appointments[1].intakeDone, true);
    equal(day.appointments[1].firstVisit, true);
  });

  test("check in, then complete an exam, sets the recall a year out", () => {
    let practice = seedPractice();
    signInStaff(practice);
    let date = futureWeekday();
    let patient = seedPatient();
    let visit = seedAppointment(patient, practice.raman, at(date, "09:00"));

    let day = checkIn(visit.id);
    equal(day.appointments[0].status, "checkedIn");
    assert(day.appointments[0].checkedInAt !== null);

    day = completeVisit(visit.id);
    equal(day.appointments[0].status, "completed");

    let row = sql<{ recallDate: string }>(`select recallDate::text as recallDate from patients where id = ${patient}`).firstOrThrow();
    equal(row.recallDate, `${Number(date.slice(0, 4)) + 1}${date.slice(4)}`);
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
    equal(day.appointments[0].status, "booked");
    equal(day.appointments[0].checkedInAt, null);

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
