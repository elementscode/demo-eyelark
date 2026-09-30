-- add scheduling tables

-- Auto-update updatedAt on row changes.
create or replace function touchUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

create table doctors (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  name text not null,
  credentials text not null default 'OD',
  bio text not null default '',
  position integer not null default 0
);

create trigger doctorsTouchUpdatedAt
  before update on doctors
  for each row execute function touchUpdatedAt();

create table staff (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  name text not null,
  email text not null unique,
  passwordHash text not null
);

create trigger staffTouchUpdatedAt
  before update on staff
  for each row execute function touchUpdatedAt();

create table patients (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  firstName text not null,
  lastName text not null,
  email text not null unique,
  phone text not null default '',
  birthDate date,
  recallDate date,
  recallNoticeSentAt timestamptz
);

create index patientsRecallDateIdx on patients (recallDate);

create trigger patientsTouchUpdatedAt
  before update on patients
  for each row execute function touchUpdatedAt();

create table appointments (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  patientId uuid not null references patients(id) on delete cascade,
  doctorId uuid not null references doctors(id),
  type text not null check (type in ('exam', 'fitting', 'followup')),
  status text not null default 'booked' check (status in ('booked', 'checkedIn', 'completed', 'cancelled')),
  startsAt timestamptz not null,
  endsAt timestamptz not null check (endsAt > startsAt),
  token text not null unique default encode(genRandomBytes(18), 'hex'),
  checkedInAt timestamptz,
  completedAt timestamptz,
  cancelledAt timestamptz,
  reminderSentAt timestamptz
);

create index appointmentsDoctorStartsAtIdx on appointments (doctorId, startsAt);
create index appointmentsPatientIdx on appointments (patientId, startsAt desc);

create trigger appointmentsTouchUpdatedAt
  before update on appointments
  for each row execute function touchUpdatedAt();

create table intakes (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  appointmentId uuid not null unique references appointments(id) on delete cascade,
  insuranceProvider text not null default '',
  insuranceMemberId text not null default '',
  eyewear text not null default 'none' check (eyewear in ('none', 'glasses', 'contacts', 'both')),
  eyewearNotes text not null default '',
  symptoms text not null default '',
  medications text not null default ''
);

create trigger intakesTouchUpdatedAt
  before update on intakes
  for each row execute function touchUpdatedAt();
