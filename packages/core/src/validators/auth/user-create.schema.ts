import { z } from "zod";

// Shared by the API route (server validation) and the create form (client
// validation). Emails are normalized so the unique index is case-insensitive.
export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.email("Enter a valid email address")),
});

export type UserCreateInput = z.output<typeof userCreateSchema>;
