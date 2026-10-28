import { AuthSession } from "./auth/auth-session.entity";
import { User } from "./auth/user.entity";
import { UserRole } from "./auth/user-role.entity";
import { RateLimitBucket } from "./security/rate-limit-bucket.entity";

export { AuthSession, RateLimitBucket, User, UserRole };

/** Every entity must be listed here; MikroORM does no folder discovery. */
export const entities = [User, UserRole, AuthSession, RateLimitBucket];
