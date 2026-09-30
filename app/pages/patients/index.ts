import { Request, Response } from "@elements/app";
import { requireStaffOrRedirect } from "#app/shared/services/auth";
import { findPatients } from "#app/shared/services/patients";
import { localDate } from "#app/shared/practice";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!requireStaffOrRedirect()) {
    return;
  }

  let filter: "all" | "recall" = req.query.filter === "recall" ? "recall" : "all";

  return new html({ initial: findPatients("", filter), filter, today: localDate() });
}
