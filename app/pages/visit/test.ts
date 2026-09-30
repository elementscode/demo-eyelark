import { test, assert, equal, sql, ForbiddenError } from "@elements/app";
import { at, futureWeekday, seedAppointment, seedPatient, seedPractice } from "#app/shared/fixtures";
import { findOpenSlots } from "#app/shared/services/schedule";
import { formatTime } from "#app/shared/practice";
import { cancelVisit, rescheduleVisit } from "./services";

test("visit", () => {
  test("reschedule moves the visit, keeps the doctor, and clears the reminder", () => {
    let practice = seedPractice();
    let date = futureWeekday();
    let visit = seedAppointment(seedPatient(), practice.okafor, at(date, "09:00"));
    sql(`update appointments set reminderSentAt = now() where id = ${visit.id}`);

    let moved = rescheduleVisit(visit.token, at(date, "14:00"), practice.okafor);

    equal(formatTime(moved.startsAt), "2:00 PM");
    equal(moved.doctorId, practice.okafor);
    let row = sql<{ reminderSentAt: Date | null }>(`select reminderSentAt from appointments where id = ${visit.id}`).firstOrThrow();
    equal(row.reminderSentAt, null);

    let jobs = sql(`
      select 1 from elements.jobs
       where path like '%SendConfirmationJob' and fields->>'kind' = 'rescheduled' and fields->>'appointmentId' = ${visit.id}
    `).all();
    equal(jobs.length, 1);
  });

  test("a visit may move half an hour into its own old time", () => {
    let practice = seedPractice();
    let date = futureWeekday();
    let visit = seedAppointment(seedPatient(), practice.raman, at(date, "09:00"));

    let moved = rescheduleVisit(visit.token, at(date, "09:30"), practice.raman);

    equal(formatTime(moved.startsAt), "9:30 AM");
  });

  test("cancel frees the time for someone else", () => {
    let practice = seedPractice();
    let date = futureWeekday();
    let visit = seedAppointment(seedPatient(), practice.raman, at(date, "09:00"));

    let cancelled = cancelVisit(visit.token);

    equal(cancelled.status, "cancelled");
    assert(findOpenSlots(date, "exam", practice.raman).some((s) => formatTime(s.startsAt) === "9:00 AM"));
  });

  test("a cancelled visit can no longer be changed", () => {
    let practice = seedPractice();
    let date = futureWeekday();
    let visit = seedAppointment(seedPatient(), practice.raman, at(date, "09:00"), "exam", "cancelled");

    let threw = false;
    try {
      rescheduleVisit(visit.token, at(date, "14:00"), "");
    } catch (err) {
      threw = true;
      assert(err instanceof ForbiddenError, `got ${err}`);
    }

    assert(threw);
  });
});
