![Eyelark, patient scheduling for an optometry practice built with Elements: the front desk day view with a column per doctor, each visit's type and intake status, checked-in patients and a visit that just checked in lighting up live.](https://elements.dev/demos/01a0f40e-45c9-7cc2-b95c-ac555590e835/poster?v=bdd36b00c772)

# Eyelark

> A demo app built with [Elements](https://elements.dev).

Patients book eye exams online by visit type and doctor and fill in intake forms; the front desk gets a live day view, check-in, patient records and yearly recall emails.

**Demo:** [Eyelark](https://elements.dev/demos/01a0f40e-45c9-7cc2-b95c-ac555590e835)

## Agent specs

What one run of the prompt below took, from an empty Elements project to this
app.

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 18 min
- **Cost:** $6.14 at API rates, September 2026

## Get started

```bash
elements create eyelark -scaffold=elementscode/demo-eyelark
```

Patients book at `/book` with no account. Staff sign in at `/signin` for the
day view (`/desk`) and patient records (`/desk/patients`). Email is written to
`.elements/logs/job.log` until you set SMTP in `config/env/development.env`.

## How it's built

Eyelark needed online booking with two doctors, visit emails, a live front desk view, and a daily recall run. Each of those is a part of Elements, so the agent spent its 18 minutes on the practice's scheduling itself.

### What Elements gave the app

- **A live day view.** `scheduleChannel` in `app/shared/services/schedule.ts` is a Channel that says which day changed. Bookings, check-ins and intake forms all notify it, and the front desk page re-reads the day it is showing, so a new booking appears on the open day view as the patient confirms it.
- **Booking in a few functions.** `bookAppointment` is an `@rpc` called straight from the booking page. `findOpenSlots` works out open times in one SQL query, and `claimSlot` locks the doctor rows first, so each time goes to one patient and "first available" picks the free doctor.
- **Email jobs and a schedule.** The booking schedules `SendConfirmationJob` inside its transaction, and two lines in `index.ts` run `SendRemindersJob` every 15 minutes and `SendRecallNoticesJob` every day at 7am. The confirmation and reminder emails carry the patient's links to the intake form and to reschedule.
- **Visit links for patients.** Each appointment has a private token, so `/visit/:token` lets a patient reschedule or cancel and `/visit/:token/intake` takes their intake form through `saveIntake`.
- **Recall from the visit itself.** `completeVisit` in `app/pages/desk/services.ts` marks the visit done and, for a comprehensive exam, sets the patient's recall date a year out. Desk pages and rpcs check the staff session with `requireStaffOrRedirect` and `requireStaff` in `app/shared/services/auth.ts`.
- **Data from SQL files.** Two migrations define the schema and seed two doctors, two front desk accounts, thirty patients with visit history and recall dates, and a week of appointments starting the day it runs. The project server applied each one as soon as it was saved.

### What the project server gave the agent

The project server runs alongside the agent and answers as soon as a file is saved: it type-checks the templates, TypeScript and SQL, applies migrations and reruns the tests, so every question came back right away and the agent kept building.

### What shipped

The app type-checks with zero errors and all 34 tests pass. Every page works on desktop and phone, and live updates arrive across tabs, such as a patient's booking appearing on the front desk's open day view.

Start in `app/shared/services/schedule.ts`.

## Seed data and demo accounts

The seed creates two doctors (Dr. Priya Raman and Dr. Samuel Okafor), thirty
patients with up to three years of visit history (a handful due or overdue for
a recall), and a week of appointments starting the day you run it, with some
intake forms already in. Both staff accounts use the password `eyelark-desk`,
and the sign-in page lists them.

| Email               | Role       |
| ------------------- | ---------- |
| maria@eyelark.test  | front desk |
| jordan@eyelark.test | front desk |

## The prompt

```text
Build a patient scheduling app named eyelark for a small optometry practice with
two doctors.

PATIENT
- Book an appointment online: type (comprehensive exam, contact lens fitting,
  follow-up), doctor or first available, and an open time.
- Fill in an intake form before the visit: insurance, current glasses or
  contacts, symptoms, medications.
- Confirmation and reminder emails, with a link to reschedule.

FRONT DESK (staff accounts)
- Day view per doctor with each appointment's type and intake status.
- Check patients in, mark visits complete.
- Patient records: contact details, past visits, next recall date.
- Recall: each completed exam sets a recall date a year out. Every morning,
  patients due for a recall in the next 30 days get an email to book.

Seed two doctors, two front desk staff, thirty patients with visit history,
and a week of appointments. Show the staff logins on the sign-in page.

The day view updates in real time as patients book and check in.
```

## License

MIT. See [LICENSE](LICENSE).
