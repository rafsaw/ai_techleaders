"use client";

import { mentorProfileSchema } from "@devmentor/core/validators/mentors/mentor-profile.schema";
import { apiCall } from "@devmentor/ui/api/apiCall";
import { CrudForm, type CrudField } from "@devmentor/ui/backend/forms/CrudForm";

import { navigateFully } from "@/app/full-navigation";
import { unlessSessionExpired } from "@/app/session-expiry";
import type { MentorProfileDto } from "@/server/services/mentors/mentor-profile.service";

const fields = [
  {
    name: "area",
    label: "Area",
    type: "select",
    placeholder: "Choose an area",
    options: [
      { value: "typescript", label: "TypeScript" },
      { value: "react", label: "React" },
      { value: "python", label: "Python" },
    ],
  },
  { name: "description", label: "Description", type: "textarea" },
  {
    name: "publicWorkLinks",
    label: "Links to public work",
    type: "textarea",
    placeholder: "https://github.com/you/project",
  },
  { name: "price25Dollars", label: "Price for 25 minutes (USD)", type: "number" },
  { name: "price50Dollars", label: "Price for 50 minutes (USD)", type: "number" },
] as const satisfies readonly CrudField[];

function initialValues(profile: MentorProfileDto | null) {
  if (!profile) return {};
  return {
    area: profile.area,
    description: profile.description,
    publicWorkLinks: profile.publicWorkLinks.join("\n"),
    price25Dollars: String(profile.prices[25].amountMinor / 100),
    price50Dollars: String(profile.prices[50].amountMinor / 100),
  };
}

export function MentorProfileForm({ profile }: { profile: MentorProfileDto | null }) {
  return (
    <CrudForm
      schema={mentorProfileSchema}
      fields={fields}
      initialValues={initialValues(profile)}
      onSubmit={async (body) => unlessSessionExpired(
        await apiCall<MentorProfileDto>("/api/mentors/profile", { method: "PUT", body }),
        "/mentor/profile",
      )}
      onSuccess={() => navigateFully("/mentor")}
    />
  );
}
