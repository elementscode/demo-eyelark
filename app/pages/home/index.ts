import { Request, Response } from "@elements/app";
import { loadDoctors } from "#app/shared/services/schedule";
import html from "./template";

export default function route(req: Request, res: Response) {
  return new html({ doctors: loadDoctors() });
}
