import { z } from "zod";

/** Every account role. One account may hold several (e.g. mentee and mentor). */
export const ROLES = ["mentee", "mentor", "operator"] as const;

export const roleSchema = z.enum(ROLES);

export type Role = z.output<typeof roleSchema>;
