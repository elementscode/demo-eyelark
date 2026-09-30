import { test, assert, equal, AuthError } from "@elements/app";
import { at, futureWeekday, seedAppointment, seedPatient, seedPractice, signInStaff } from "#app/shared/fixtures";
import { addDays, localDate } from "#app/shared/practice";
import { recallState } from "#app/shared/services/patients";
import { searchPatients } from "./services";

test("patients", () => {
  test("search matches name, email or phone", () => {
    let practice = seedPractice();
    signInStaff(practice);
    seedPatient("pat@example.com");

    equal(searchPatients("pat ex", "all").length, 1);
    equal(searchPatients("555-0100", "all").length, 1);
    equal(searchPatients("nobody", "all").length, 0);
  });

  test("recall due lists only patients due within 30 days or overdue", () => {
    let practice = seedPractice();
    signInStaff(practice);
    seedPatient("soon@example.com", addDays(localDate(), 10));
    seedPatient("late@example.com", addDays(localDate(), -5));
    seedPatient("later@example.com", addDays(localDate(), 90));

    equal(searchPatients("", "recall").map((p) => p.email), ["late@example.com", "soon@example.com"]);
  });

  test("shows the next booked visit", () => {
    let practice = seedPractice();
    signInStaff(practice);
    seedAppointment(seedPatient(), practice.raman, at(futureWeekday(), "09:00"));

    assert(searchPatients("", "all")[0].nextVisit !== null);
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
