import { test, assert, equal, sql, session, AuthError } from "@elements/app";
import { signin } from "#app/shared/services/auth";

test("signin", () => {
  test("a staff member signs in by email and password", () => {
    sql(`insert into staff (name, email, passwordHash) values ('Desk', 'desk@eyelark.test', crypt('secret-pass', genSalt('bf', 4)))`);

    signin(" Desk@Eyelark.test ", "secret-pass");

    equal(session.get("userName"), "Desk");
  });

  test("a wrong password is refused without saying which part was wrong", () => {
    sql(`insert into staff (name, email, passwordHash) values ('Desk', 'desk@eyelark.test', crypt('secret-pass', genSalt('bf', 4)))`);

    let threw = false;
    try {
      signin("desk@eyelark.test", "nope");
    } catch (err: any) {
      threw = true;
      assert(err instanceof AuthError, `got ${err}`);
      equal(err.message, "That email and password do not match.");
    }

    assert(threw);
    assert(!session.isLoggedIn());
  });
});
