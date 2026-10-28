import { userCreateSchema } from "@devmentor/core/validators/auth/user-create.schema";

import { makeCrudRoute } from "@/server/http";

// Public until the operator gate (accounts spec, Phase 1 step 10) switches
// it to `access: { role: "operator" }`.
export const { GET, POST } = makeCrudRoute({
  methods: ["GET", "POST"],
  access: "public",
  logRoute: "/api/users",
  service: ({ userService }) => userService,
  createSchema: userCreateSchema,
});
