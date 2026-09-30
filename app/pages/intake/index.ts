import { NotFoundError, Request, Response } from "@elements/app";
import { findVisitByToken } from "#app/shared/services/visits";
import { emptyIntake, loadIntake } from "./services";
import html from "./template";

export default function route(req: Request, res: Response) {
  let visit = findVisitByToken(String(req.params.token));
  if (!visit) {
    throw new NotFoundError("visit not found");
  }

  let saved = loadIntake(visit.id);

  return new html({ visit, initial: saved ?? emptyIntake(), submitted: !!saved });
}
