import { Request, Response } from "@elements/app";
import { requireStaffOrRedirect } from "#app/shared/services/auth";
import { isValidDate, scheduleChannel } from "#app/shared/services/schedule";
import { localDate } from "#app/shared/practice";
import { readDay } from "./services";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!requireStaffOrRedirect()) {
    return;
  }

  let requested = String(req.query.date ?? "");
  let date = isValidDate(requested) ? requested : localDate();

  // Listen before reading, so a booking made in between still arrives.
  let listener = scheduleChannel.listen();

  return new html({ initialDay: readDay(date), listener });
}
