import { NotFoundError, Request, Response } from "@elements/app";
import { findVisitByToken } from "#app/shared/services/visits";
import { loadDoctors } from "#app/shared/services/schedule";
import { localDate } from "#app/shared/practice";
import html from "./template";

export default function route(req: Request, res: Response) {
  let visit = findVisitByToken(String(req.params.token));
  if (!visit) {
    throw new NotFoundError("visit not found");
  }

  return new html({
    initialVisit: visit,
    doctors: loadDoctors(),
    justBooked: req.query.booked === "1",
    intakeSent: req.query.intake === "1",
    pickerDate: localDate(visit.startsAt) > localDate() ? localDate(visit.startsAt) : localDate(),
  });
}
