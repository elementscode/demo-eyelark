import { test, equal } from "@elements/app";
import { findVisitByToken } from "#app/shared/services/visits";
import { at, futureWeekday, seedAppointment, seedPatient, seedPractice } from "#app/shared/fixtures";

test("patient", () => {
  test("a visit reads back with its doctor and intake status", () => {
    let practice = seedPractice();
    let visit = seedAppointment(seedPatient(), practice.okafor, at(futureWeekday(), "13:00"), "fitting");

    let summary = findVisitByToken(visit.token);

    equal(summary?.doctorName, "Dr. Test Okafor");
    equal(summary?.intakeDone, false);
    equal(summary?.type, "fitting");
  });
});
