import { userCreateSchema } from "@devmentor/core/validators/auth/user-create.schema";

import { makeCrudRoute } from "@/server/http";

// The users reference example, open only to operators (accounts AD4): it
// lists every account's email. Signed out answers 401, without the role 403.
export const { GET, POST } = makeCrudRoute({
  methods: ["GET", "POST"],
  access: { role: "operator" },
  logRoute: "/api/users",
  service: ({ userService }) => userService,
  createSchema: userCreateSchema,
});
