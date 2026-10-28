import { z } from "zod";

import { emailSchema } from "./email.schema";

// Shared by the API route (server validation) and the create form (client
// validation). Emails are normalized so the unique index is case-insensitive.
export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: emailSchema,
});

export type UserCreateInput = z.output<typeof userCreateSchema>;
