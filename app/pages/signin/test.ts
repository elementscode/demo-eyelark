import { test, assert, equal, sql, session, AuthError } from "@elements/app";
import { signin } from "#app/shared/services/auth";

test("signin", () => {
  // Staff emails are unique and other test files insert staff too.
  function desk(): string {
    let email = `desk.${crypto.randomUUID().slice(0, 8)}@eyelark.test`;
    sql(`insert into staff (name, email, passwordHash) values ('Desk', ${email}, crypt('secret-pass', genSalt('bf', 4)))`);

    return email;
  }

  test("a staff member signs in by email and password", () => {
    let email = desk();

    signin(` ${email.replace("desk", "Desk").replace("eyelark", "Eyelark")} `, "secret-pass");

    equal(session.get("userName"), "Desk");
  });

  test("a wrong password is refused without saying which part was wrong", () => {
    let email = desk();

    let threw = false;
    try {
      signin(email, "nope");
    } catch (err: any) {
      threw = true;
      assert(err instanceof AuthError, `got ${err}`);
      equal(err.message, "That email and password do not match.");
    }

    assert(threw);
    assert(!session.isLoggedIn());
  });
});
