import { test, assert, equal, sql, ValidationError } from "@elements/app";
import { at, futureWeekday, seedAppointment, seedPatient, seedPractice } from "#app/shared/fixtures";
import { emptyIntake, loadIntake, saveIntake } from "./services";

test("intake", () => {
  test("saves, then updates in place", () => {
    let practice = seedPractice();
    let visit = seedAppointment(seedPatient(), practice.raman, at(futureWeekday(), "09:00"));
    let form = { ...emptyIntake(), insuranceProvider: "Cascade Vision Plan", symptoms: "Blurry at night", medications: "None" };

    saveIntake(visit.token, form);
    saveIntake(visit.token, { ...form, eyewear: "both" });

    let count = sql<{ n: number }>(`select count(*)::int as n from intakes where appointmentId = ${visit.id}`).firstOrThrow();
    equal(count.n, 1);
    equal(loadIntake(visit.id)?.eyewear, "both");
  });

  test("the required answers come back per field", () => {
    let practice = seedPractice();
    let visit = seedAppointment(seedPatient(), practice.raman, at(futureWeekday(), "09:00"));

    let threw = false;
    try {
      saveIntake(visit.token, emptyIntake());
    } catch (err: any) {
      threw = true;
      assert(err instanceof ValidationError, `got ${err}`);
      equal(Object.keys(err.errors ?? {}).sort(), ["insuranceProvider", "medications", "symptoms"]);
    }

    assert(threw);
  });
});
