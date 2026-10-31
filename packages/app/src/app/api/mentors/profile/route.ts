import { parseInput, readJsonBody } from "@devmentor/core";
import { mentorProfileSchema } from "@devmentor/core/validators/mentors/mentor-profile.schema";

import { apiHandler } from "@/server/http";

export const PUT = apiHandler(
  async ({ req, cradle, principal }) => {
    const input = parseInput(mentorProfileSchema, await readJsonBody(req));
    return cradle.mentorProfileService.save(principal, input);
  },
  { access: { role: "mentor" }, logRoute: "/api/mentors/profile" },
);
