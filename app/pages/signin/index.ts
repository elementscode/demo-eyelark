import { Request, Response, redirect, session } from "@elements/app";
import { DEMO_PASSWORD, listStaffLogins } from "#app/shared/services/auth";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (session.isLoggedIn()) {
    redirect("/desk");
    return;
  }

  return new html({ logins: listStaffLogins(), password: DEMO_PASSWORD });
}
