-- demo practice data: two doctors, two front desk staff, thirty patients with
-- visit history, and a week of appointments starting today.

insert into doctors (name, credentials, bio, position) values
  ('Dr. Priya Raman', 'OD', 'Comprehensive and pediatric eye care, dry eye.', 1),
  ('Dr. Samuel Okafor', 'OD', 'Contact lens specialist, including scleral and ortho-k.', 2);

insert into staff (name, email, passwordHash) values
  ('Maria Delgado', 'maria@eyelark.test', crypt('eyelark-desk', genSalt('bf', 12))),
  ('Jordan Kim', 'jordan@eyelark.test', crypt('eyelark-desk', genSalt('bf', 12)));

select setseed(0.42);

insert into patients (firstName, lastName, email, phone, birthDate)
select f, l,
       lower(f) || '.' || lower(l) || '@example.com',
       '(503) 555-' || lpad((1000 + n * 37)::text, 4, '0'),
       date '1950-01-01' + (random() * 25000)::int
  from unnest(
         array['Ava','Noah','Mia','Liam','Zoe','Ethan','Grace','Lucas','Chloe','Mateo',
               'Nora','Owen','Isla','Caleb','Ruby','Felix','Hazel','Julian','Ivy','Theo',
               'Elena','Marcus','Leah','Andre','Sofia','Wesley','Naomi','Diego','Clara','Hugo'],
         array['Thompson','Nguyen','Patel','Garcia','Chen','Walker','Okoye','Rossi','Kowalski','Hernandez',
               'Bennett','Sato','Murphy','Fischer','Alvarez','Brooks','Larsen','Mensah','Cohen','Park',
               'Dubois','Reyes','Ahmed','Silva','Novak','Price','Tanaka','Ortiz','Lindqvist','Moreau']
       ) with ordinality as t(f, l, n);

do $$
declare
  tz constant text := 'America/Los_Angeles';
  today date := (now() at time zone 'America/Los_Angeles')::date;
  p record;
  docs uuid[];
  doc uuid;
  pats uuid[];
  lastexam date;
  visitday date;
  hour numeric;
  day date;
  cursor_t time;
  boundary time;
  kind text;
  mins int;
  starts timestamptz;
  pick int := 0;
  appt uuid;
  i int;
begin
  select array_agg(id order by position) into docs from doctors;
  select array_agg(id order by random()) into pats from patients;

  -- Visit history. Every patient has had one to three annual exams; a few are
  -- due for a recall in the next month and a few are overdue.
  for p in select id, row_number() over (order by lastName) as n from patients loop
    doc := docs[1 + (p.n % 2)];

    if p.n % 5 = 0 then
      lastexam := today - (336 + (random() * 25)::int);
    elsif p.n % 7 = 0 then
      lastexam := today - (380 + (random() * 90)::int);
    else
      lastexam := today - (20 + (random() * 290)::int);
    end if;

    for i in 0 .. (p.n % 3) loop
      visitday := lastexam - (i * (360 + (random() * 40)::int));
      visitday := visitday - (case extract(isodow from visitday) when 6 then 1 when 7 then 2 else 0 end)::int;
      hour := (array[9, 9.5, 10, 10.5, 11, 13, 14, 14.5, 15, 16])[1 + (random() * 9)::int];
      starts := (visitday + make_interval(mins => (hour * 60)::int)) at time zone tz;

      insert into appointments (patientId, doctorId, type, status, startsAt, endsAt, checkedInAt, completedAt, reminderSentAt)
           values (p.id, doc, 'exam', 'completed', starts, starts + interval '60 minutes',
                   starts - interval '5 minutes', starts + interval '55 minutes', starts - interval '1 day');

      if i = 0 and p.n % 4 = 0 then
        starts := starts + interval '14 days';
        insert into appointments (patientId, doctorId, type, status, startsAt, endsAt, checkedInAt, completedAt, reminderSentAt)
             values (p.id, docs[2], 'fitting', 'completed', starts, starts + interval '60 minutes',
                     starts - interval '5 minutes', starts + interval '55 minutes', starts - interval '1 day');
      end if;

      if i = 1 and p.n % 3 = 0 then
        starts := starts + interval '21 days';
        insert into appointments (patientId, doctorId, type, status, startsAt, endsAt, checkedInAt, completedAt, reminderSentAt)
             values (p.id, doc, 'followup', 'completed', starts, starts + interval '30 minutes',
                     starts - interval '5 minutes', starts + interval '25 minutes', starts - interval '1 day');
      end if;
    end loop;
  end loop;

  -- The coming week. Fill part of each doctor's day, leaving open times for
  -- online booking.
  for day in select d::date from generate_series(today, today + 6, interval '1 day') d
              where extract(isodow from d) < 6 loop
    foreach doc in array docs loop
      cursor_t := time '09:00';

      while cursor_t < time '17:00' loop
        boundary := case when cursor_t < time '12:00' then time '12:00' else time '17:00' end;

        if cursor_t = time '12:00' then
          cursor_t := time '13:00';
          continue;
        end if;

        if random() < (case when day = today then 0.7 else 0.5 end) then
          kind := (array['exam', 'exam', 'exam', 'fitting', 'followup', 'followup'])[1 + (random() * 5)::int];
          mins := case kind when 'followup' then 30 else 60 end;

          if cursor_t + make_interval(mins => mins) <= boundary then
            starts := (day + cursor_t) at time zone tz;
            pick := pick + 1;

            insert into appointments (patientId, doctorId, type, status, startsAt, endsAt, checkedInAt, completedAt, reminderSentAt)
                 values (pats[1 + (pick % 30)], doc, kind,
                         case
                           when starts + make_interval(mins => mins) <= now() then 'completed'
                           when starts <= now() + interval '10 minutes' then 'checkedIn'
                           else 'booked'
                         end,
                         starts, starts + make_interval(mins => mins),
                         case when starts <= now() + interval '10 minutes' then starts - interval '6 minutes' end,
                         case when starts + make_interval(mins => mins) <= now() then starts + make_interval(mins => mins - 5) end,
                         case when starts < now() + interval '1 day' then now() end)
              returning id into appt;

            if random() < 0.6 or starts < now() then
              insert into intakes (appointmentId, insuranceProvider, insuranceMemberId, eyewear, eyewearNotes, symptoms, medications)
                   values (appt,
                           (array['Cascade Vision Plan', 'Clearview Vision', 'Northwest Health', 'Summit Vision Care', 'Self-pay'])[1 + (random() * 4)::int],
                           upper(substr(md5(appt::text), 1, 9)),
                           (array['glasses', 'contacts', 'both', 'none'])[1 + (random() * 3)::int],
                           (array['Progressives, about two years old', 'Daily disposables', 'Reading glasses only', ''])[1 + (random() * 3)::int],
                           (array['Blurry at distance when driving at night', 'Eyes feel dry by late afternoon', 'Occasional headaches after screen work', 'No new symptoms', 'Floaters in the right eye'])[1 + (random() * 4)::int],
                           (array['None', 'Lisinopril 10mg', 'Artificial tears as needed', 'Levothyroxine', 'None'])[1 + (random() * 4)::int]);
            end if;

            cursor_t := cursor_t + make_interval(mins => mins);
            continue;
          end if;
        end if;

        cursor_t := cursor_t + interval '30 minutes';
      end loop;
    end loop;
  end loop;

  -- A completed exam sets the next recall a year out.
  update patients pt
     set recallDate = last.day + interval '1 year'
    from (select patientId, max((startsAt at time zone tz)::date) as day
            from appointments
           where type = 'exam' and status = 'completed'
           group by patientId) last
   where last.patientId = pt.id;
end;
$$;
