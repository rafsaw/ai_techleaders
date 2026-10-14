import { User } from "./auth/user.entity";

export { User };

/** Every entity must be listed here; MikroORM does no folder discovery. */
export const entities = [User];
