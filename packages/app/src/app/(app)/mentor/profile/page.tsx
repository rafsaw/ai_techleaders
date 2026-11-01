import type { Metadata } from "next";

import { requireRole } from "@/server/auth/page-guards";
import { createRequestScope } from "@/server/container";

import { MentorProfileForm } from "./mentor-profile-form";

export const metadata: Metadata = { title: "Mentor profile" };

export default async function MentorProfilePage() {
  const principal = await requireRole("mentor", { returnTo: "/mentor/profile" });
  const profile = await createRequestScope().cradle.mentorProfileService.getOwn(principal);
  return (
    <main className="mx-auto w-full max-w-content px-page-gutter py-section">
      <div className="flex max-w-text flex-col gap-component">
        <h1 className="text-page-title">{profile ? "Edit profile" : "Create your profile"}</h1>
        <MentorProfileForm profile={profile} />
      </div>
    </main>
  );
}
