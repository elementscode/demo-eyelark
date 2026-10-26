![Online booking with intake forms, built by Claude Code on Elements: the front desk day view with a column per doctor, each visit's type and intake status, checked-in patients and a visit that just checked in lighting up live.](https://elements.dev/demos/01a0f40e-45c9-7cc2-b95c-ac555590e835/poster?v=bdd36b00c772)

# Online booking with intake forms, built by Claude Code on Elements

> Eyelark is a full-stack app built with Claude Code on Elements.

Patients book eye exams online by visit type and doctor and fill in intake forms; the front desk gets a live day view, check-in, patient records and yearly recall emails.

[Run this app on your machine](https://elements.dev/demos/01a0f40e-45c9-7cc2-b95c-ac555590e835). Use this demo as inspiration, or as the starting point for your own app. Your agent creates a new app with this one as the scaffold, and you prompt it to add whatever features you want.

Patients book at `/book` with no account. Staff sign in at `/signin` for the
day view (`/desk`) and patient records (`/desk/patients`). Email is written to
`.elements/logs/job.log` until you set SMTP in `config/env/development.env`.

## How it's built

Eyelark needed online booking with two doctors, visit emails, a live front desk view, and a daily recall run. Each of those is a part of Elements, so the agent spent its 18 minutes on the practice's scheduling itself.

- **A live day view.** Bookings, check-ins and intake forms notify a channel with the day that changed, and the front desk re-reads the day it is showing, so a new booking appears on the open day view as the patient confirms it.

- **Online booking.** The booking page finds open times for both doctors in one SQL query and books through an `@rpc` function. It locks the doctors first, so each time goes to one patient and "first available" picks the free doctor.

- **Emails from jobs.** Booking schedules a confirmation email in the same transaction, and one-line cron schedules send reminders every 15 minutes and recall notices every morning. Each email links the patient to the intake form and to reschedule.

- **Visit links for patients.** Each appointment has a private link where the patient reschedules, cancels or fills in the intake form straight from their email.

- **Recall from the visit itself.** Marking a comprehensive exam complete sets the patient's next recall a year out. Front desk pages and server calls check the staff session.

- **Data from SQL files.** Migrations define the schema and seed two doctors, two front desk accounts, thirty patients with visit history and recall dates, and a week of appointments from the day it runs. The project server applied each one as soon as it was saved.

## Why Elements

Elements is an integrated full-stack app framework and a project server. The project server checks the agent's work as it builds: it type-checks the server and browser code, analyzes the program, applies migrations and runs the tests, then reports the results to the agent. A security mistake, such as calling a server-only function from the browser, is a compile error. The agent reads the report and fixes its own mistakes before it tells you a feature is done. The same checks run on every feature you ask for next.
