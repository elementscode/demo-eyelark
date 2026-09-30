import { Request, Response } from "@elements/app";
import { BookingForm, findOpenSlots, loadDoctors } from "#app/shared/services/schedule";
import { AppointmentType, VISIT_TYPES, addDays, isWeekend, localDate } from "#app/shared/practice";
import html from "./template";

export default function route(req: Request, res: Response) {
  let requested = String(req.query.type ?? "");
  let type = (VISIT_TYPES.find((t) => t.id === requested)?.id ?? "exam") as AppointmentType;

  let form: BookingForm = {
    type,
    doctorId: "",
    startsAt: null,
    firstName: "",
    lastName: "",
    email: String(req.query.email ?? ""),
    phone: "",
    birthDate: "",
  };

  // Open on the first day with a free time, so the first screen has choices.
  let date = localDate();
  let slots = findOpenSlots(date, type, null);

  for (let n = 1; n <= 14 && slots.length === 0; n++) {
    let next = addDays(localDate(), n);
    if (isWeekend(next)) {
      continue;
    }

    date = next;
    slots = findOpenSlots(date, type, null);
  }

  return new html({
    doctors: loadDoctors(),
    initialForm: form,
    initialPicker: { type, doctorId: "", date, slots, startsAt: null },
  });
}
