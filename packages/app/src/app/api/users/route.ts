import { userCreateSchema } from "@devmentor/core/validators/auth/user-create.schema";

import { makeCrudRoute } from "@/server/http";

// TODO(auth): unauthenticated until the auth concept lands; then guard with
// requireSession before exposing this outside development.
export const { GET, POST } = makeCrudRoute({
  methods: ["GET", "POST"],
  service: ({ userService }) => userService,
  createSchema: userCreateSchema,
});
