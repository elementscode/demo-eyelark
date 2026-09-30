import { test, equal, sql } from "@elements/app";
import { seedAppointment, seedPatient, seedPractice, at, futureWeekday } from "#app/shared/fixtures";
import { addDays, localDate } from "#app/shared/practice";
import { SendRecallNoticesJob } from "./send-recall-notices";
import { SendRemindersJob } from "./send-reminders";

test("recall notices", () => {
  test("go to patients due within 30 days, once", () => {
    seedPractice();
    let due = seedPatient("due@example.com", addDays(localDate(), 12));
    seedPatient("later@example.com", addDays(localDate(), 60));

    new SendRecallNoticesJob({}).run();
    new SendRecallNoticesJob({}).run();

    let sent = sql<{ id: string }>(`select id from patients where recallNoticeSentAt is not null`).all();
    equal(sent.map((p) => p.id), [due]);
  });

  test("skip a patient who already has an exam booked", () => {
    let practice = seedPractice();
    let patient = seedPatient("due@example.com", addDays(localDate(), 12));
    seedAppointment(patient, practice.raman, at(futureWeekday(), "09:00"));

    new SendRecallNoticesJob({}).run();

    let row = sql<{ sentAt: Date | null }>(`select recallNoticeSentAt as sentAt from patients where id = ${patient}`).firstOrThrow();
    equal(row.sentAt, null);
  });
});

test("reminders", () => {
  test("mark visits in the next 24 hours, and only those", () => {
    let practice = seedPractice();
    let soon = seedAppointment(seedPatient("soon@example.com"), practice.raman, new Date(Date.now() + 3 * 3_600_000));
    seedAppointment(seedPatient("later@example.com"), practice.raman, new Date(Date.now() + 72 * 3_600_000));

    new SendRemindersJob({}).run();

    let reminded = sql<{ id: string }>(`select id from appointments where reminderSentAt is not null`).all();
    equal(reminded.map((a) => a.id), [soon.id]);
  });
});
