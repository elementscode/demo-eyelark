import { test, assert, equal, sql, ValidationError } from "@elements/app";
import { at, futureWeekday, seedAppointment, seedPatient, seedPractice } from "#app/shared/fixtures";
import { addDays, formatTime } from "#app/shared/practice";
import { BookingForm, bookAppointment, findOpenSlots } from "./schedule";

function times(date: string, type: "exam" | "followup", doctorId: string | null): string[] {
  return findOpenSlots(date, type, doctorId).map((s) => formatTime(s.startsAt));
}

function booking(startsAt: Date, overrides: Partial<BookingForm> = {}): BookingForm {
  return {
    type: "exam",
    doctorId: "",
    startsAt,
    firstName: "Rosa",
    lastName: "Martinez",
    email: "Rosa@Example.com",
    phone: "(503) 555-0199",
    birthDate: "1988-04-12",
    ...overrides,
  };
}

test("open slots", () => {
  test("an exam day runs 9 to noon and 1 to 5, and never over lunch", () => {
    let practice = seedPractice();
    let open = times(futureWeekday(), "exam", practice.raman);

    equal(open[0], "9:00 AM");
    assert(open.includes("11:00 AM"), "11:00 ends at noon");
    assert(!open.includes("11:30 AM"), "11:30 would run into lunch");
    assert(!open.includes("12:00 PM"), "lunch is closed");
    assert(open.includes("4:00 PM"), "4:00 ends at close");
    assert(!open.includes("4:30 PM"), "4:30 would run past close");
  });

  test("a follow-up can take the last half hour", () => {
    let practice = seedPractice();

    assert(times(futureWeekday(), "followup", practice.raman).includes("4:30 PM"));
  });

  test("a booked visit blocks the times it overlaps for that doctor only", () => {
    let practice = seedPractice();
    let date = futureWeekday();
    seedAppointment(seedPatient(), practice.raman, at(date, "10:00"));

    let raman = times(date, "exam", practice.raman);
    assert(!raman.includes("9:30 AM") && !raman.includes("10:00 AM") && !raman.includes("10:30 AM"), `got ${raman}`);
    assert(raman.includes("9:00 AM") && raman.includes("11:00 AM"), `got ${raman}`);
    assert(times(date, "exam", practice.okafor).includes("10:00 AM"));
  });

  test("first available lists a time while either doctor is free", () => {
    let practice = seedPractice();
    let date = futureWeekday();
    seedAppointment(seedPatient(), practice.raman, at(date, "10:00"));

    let slot = findOpenSlots(date, "exam", null).find((s) => formatTime(s.startsAt) === "10:00 AM");
    equal(slot?.doctorIds, [practice.okafor]);
  });

  test("weekends and past days have nothing", () => {
    seedPractice();
    let saturday = futureWeekday();

    while (new Date(`${saturday}T12:00:00Z`).getUTCDay() !== 6) {
      saturday = addDays(saturday, 1);
    }

    equal(findOpenSlots(saturday, "exam", null).length, 0);
    equal(findOpenSlots("2020-01-06", "exam", null).length, 0);
  });
});

test("booking", () => {
  test("creates the patient, the visit and a confirmation job", () => {
    let practice = seedPractice();
    let startsAt = at(futureWeekday(), "09:00");

    let token = bookAppointment(booking(startsAt));

    let row = sql<{ email: string; doctorId: string; type: string; status: string }>(`
      select p.email, a.doctorId, a.type, a.status
        from appointments a join patients p on p.id = a.patientId
       where a.token = ${token}
    `).firstOrThrow();

    equal(row.email, "rosa@example.com");
    equal(row.doctorId, practice.raman, "first available takes the first doctor");
    equal(row.status, "booked");

    let jobs = sql(`select 1 from elements.jobs where path like '%SendConfirmationJob' and state = 'pending'`).all();
    equal(jobs.length, 1);
  });

  test("a returning patient is matched by email", () => {
    seedPractice();
    let existing = seedPatient("rosa@example.com");

    bookAppointment(booking(at(futureWeekday(), "09:00")));

    let count = sql<{ n: number }>(`select count(*)::int as n from patients`).firstOrThrow();
    equal(count.n, 1);
    let visit = sql<{ patientId: string }>(`select patientId from appointments`).firstOrThrow();
    equal(visit.patientId, existing);
  });

  test("first available moves to the second doctor when the first is taken", () => {
    let practice = seedPractice();
    let startsAt = at(futureWeekday(), "09:00");

    bookAppointment(booking(startsAt, { email: "one@example.com" }));
    let token = bookAppointment(booking(startsAt, { email: "two@example.com" }));

    let row = sql<{ doctorId: string }>(`select doctorId from appointments where token = ${token}`).firstOrThrow();
    equal(row.doctorId, practice.okafor);
  });

  test("a taken time is refused", () => {
    let practice = seedPractice();
    let startsAt = at(futureWeekday(), "09:00");
    bookAppointment(booking(startsAt, { doctorId: practice.raman, email: "one@example.com" }));

    let threw = false;
    try {
      bookAppointment(booking(startsAt, { doctorId: practice.raman, email: "two@example.com" }));
    } catch (err) {
      threw = true;
      assert(err instanceof ValidationError, `got ${err}`);
    }

    assert(threw);
  });

  test("missing details come back per field", () => {
    seedPractice();

    let threw = false;
    try {
      bookAppointment(booking(at(futureWeekday(), "09:00"), { firstName: " ", email: "nope", phone: "12" }));
    } catch (err: any) {
      threw = true;
      assert(err instanceof ValidationError, `got ${err}`);
      equal(Object.keys(err.errors ?? {}).sort(), ["email", "firstName", "phone"]);
    }

    assert(threw);
  });
});
