import { defineEntity, p } from "@mikro-orm/core";

import { baseProperties } from "../base";
import { MentorProfile } from "../mentors/mentor-profile.entity";

const AvailabilitySlotSchema = defineEntity({
  name: "AvailabilitySlot",
  tableName: "availability_slots",
  uniques: [{ properties: ["mentorProfile", "startsAt"] }],
  properties: {
    ...baseProperties,
    mentorProfile: () => p.manyToOne(MentorProfile).fieldName("mentor_profile_id").deleteRule("restrict"),
    startsAt: p.datetime().fieldName("starts_at"),
    bookedAt: p.datetime().nullable().fieldName("booked_at"),
  },
});

/** A concrete time offered by a mentor, optionally claimed by a booking. */
export class AvailabilitySlot extends AvailabilitySlotSchema.class {}
AvailabilitySlotSchema.setClass(AvailabilitySlot);
