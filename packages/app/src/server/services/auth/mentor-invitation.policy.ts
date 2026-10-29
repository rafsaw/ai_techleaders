// Free of `@devmentor/db` on purpose: the operator CLI imports this before it
// loads env, and the db config reads DATABASE_URL when it is first imported.

/** An invitation link stays valid this long after create or resend (accounts AD5); not configurable. */
export const INVITATION_LIFETIME_DAYS = 14;
