import { test, assert, equal, AuthError } from "@elements/app";
import { at, futureWeekday, seedAppointment, seedPatient, seedPractice, signInStaff } from "#app/shared/fixtures";
import { addDays, localDate } from "#app/shared/practice";
import { recallState } from "#app/shared/services/patients";
import { searchPatients } from "./services";

test("patients", () => {
  test("search matches name, email or phone", () => {
    let practice = seedPractice();
    signInStaff(practice);
    let patient = seedPatient("pat@example.com");

    // The search also sees the seed patients, so only this test's row counts.
    let found = (query: string) => searchPatients(query, "all").filter((p) => p.id === patient);
    equal(found("pat ex").length, 1);
    equal(found("555-0100").length, 1);
    equal(found("nobody").length, 0);
  });

  test("recall due lists only patients due within 30 days or overdue", () => {
    let practice = seedPractice();
    signInStaff(practice);
    let soon = seedPatient("soon@example.com", addDays(localDate(), 10));
    let late = seedPatient("late@example.com", addDays(localDate(), -5));
    let later = seedPatient("later@example.com", addDays(localDate(), 90));
    let mine = [soon, late, later];

    let due = searchPatients("", "recall").filter((p) => mine.includes(p.id));
    equal(due.map((p) => p.id), [late, soon]);
  });

  test("shows the next booked visit", () => {
    let practice = seedPractice();
    signInStaff(practice);
    let patient = seedPatient();
    seedAppointment(patient, practice.raman, at(futureWeekday(), "09:00"));

    let row = searchPatients("", "all").find((p) => p.id === patient);
    assert(row !== undefined && row.nextVisit !== null);
  });

  test("recall state", () => {
    equal(recallState(null, "2026-09-30"), "none");
    equal(recallState("2026-09-01", "2026-09-30"), "overdue");
    equal(recallState("2026-10-30", "2026-09-30"), "due");
    equal(recallState("2026-11-15", "2026-09-30"), "later");
  });

  test("needs a staff session", () => {
    let threw = false;
    try {
      searchPatients("", "all");
    } catch (err) {
      threw = true;
      assert(err instanceof AuthError, `got ${err}`);
    }

    assert(threw);
  });
});
