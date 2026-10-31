import { mentorAreas } from "@devmentor/core/validators/mentors/mentor-profile.schema";
import { defineEntity, p } from "@mikro-orm/core";

import { baseProperties } from "../base";
import { User } from "../auth/user.entity";

const MentorProfileSchema = defineEntity({
  name: "MentorProfile",
  tableName: "mentor_profiles",
  properties: {
    ...baseProperties,
    user: () => p.manyToOne(User).fieldName("user_id").unique().deleteRule("cascade"),
    area: p.enum(mentorAreas),
    description: p.text(),
    publicWorkLinks: p.text().array(),
    price25Cents: p.integer().check("price_25_cents > 0"),
    price50Cents: p.integer().check("price_50_cents > 0"),
  },
});

/** One public profile and pair of session prices for one mentor account. */
export class MentorProfile extends MentorProfileSchema.class {}
MentorProfileSchema.setClass(MentorProfile);
