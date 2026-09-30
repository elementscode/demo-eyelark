import { sql, session, AuthError, redirect } from "@elements/app";

export interface StaffLogin {
  name: string;
  email: string;
}

/** The seeded front desk accounts, shown on the sign-in page in development. */
export const DEMO_PASSWORD = "eyelark-desk";

export function listStaffLogins(): StaffLogin[] {
  return sql<StaffLogin>(`select name, email from staff order by name`).all();
}

/** @rpc */
export function signin(email: string, password: string) {
  let address = email.trim().toLowerCase();

  if (!address || !password) {
    throw new AuthError("Enter your email and password.");
  }

  let user = sql<{ id: string; name: string }>(`
    select id, name from staff
     where email = ${address}
       and passwordHash = crypt(${password}, passwordHash)
  `).first();

  if (!user) {
    throw new AuthError("That email and password do not match.");
  }

  session.login({ userId: user.id, userName: user.name });
}

/** @rpc */
export function signout() {
  session.logout();
}

/**
 * The guard for every front desk route and rpc. A route sends a signed-out
 * visitor to sign in; an rpc throws.
 */
export function requireStaff(): string {
  let userId = session.get("userId");

  if (!userId || sql(`select 1 from staff where id = ${userId}`).empty()) {
    throw new AuthError("Sign in to the front desk.");
  }

  return userId;
}

export function requireStaffOrRedirect(): boolean {
  let userId = session.get("userId");

  if (!userId || sql(`select 1 from staff where id = ${userId}`).empty()) {
    redirect("/signin");
    return false;
  }

  return true;
}
