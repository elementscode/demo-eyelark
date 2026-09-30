import { App } from "@elements/app";
import config from "#config";
import home from "#app/pages/home";
import book from "#app/pages/book";
import visit from "#app/pages/visit";
import intake from "#app/pages/intake";
import signin from "#app/pages/signin";
import desk from "#app/pages/desk";
import patients from "#app/pages/patients";
import patient from "#app/pages/patient";
import { SendRemindersJob } from "#app/jobs/send-reminders";
import { SendRecallNoticesJob } from "#app/jobs/send-recall-notices";
import notFound from "#app/pages/errors/not-found";
import unhandled from "#app/pages/errors/unhandled";

const app = new App();

app.route("/", home);
app.route("/book", book);
app.route("/visit/:token", visit);
app.route("/visit/:token/intake", intake);
app.route("/signin", signin);
app.route("/desk", desk);
app.route("/desk/patients", patients);
app.route("/desk/patients/:id", patient);

app.cron("every 15m", "visit reminders", () => new SendRemindersJob().schedule());
app.cron("every day at 7am", "recall notices", () => new SendRecallNoticesJob().schedule());

app.error((req, res, err) => {
  switch (err.statusCode) {
    case 404:
      return notFound(req, res, err);

    default:
      return unhandled(req, res, err);
  }
});

app.start(config);
