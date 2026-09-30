![Eyelark, patient scheduling for an optometry practice built with Elements: the front desk day view with a column per doctor, each visit's type and intake status, checked-in patients and a visit that just checked in lighting up live.](POSTER_URL)

# Eyelark

> A demo app built with [Elements](https://elements.dev).

Patients book eye exams online by visit type and doctor and fill in intake forms; the front desk gets a live day view, check-in, patient records and yearly recall emails.

**Demo:** [Eyelark](TBD)

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
