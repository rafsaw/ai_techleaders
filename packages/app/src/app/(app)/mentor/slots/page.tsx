import type { Metadata } from "next";
import { requireRole } from "@/server/auth/page-guards";
import { createRequestScope } from "@/server/container";
import { SlotManager } from "./slot-manager";

export const metadata: Metadata = { title: "Manage slots" };

export default async function MentorSlotsPage() {
  const principal = await requireRole("mentor", { returnTo: "/mentor/slots" });
  const slots = await createRequestScope().cradle.slotService.listUpcoming(principal);
  return <main className="mx-auto w-full max-w-content px-page-gutter py-section"><div className="flex max-w-text flex-col gap-component"><h1 className="text-page-title">Manage slots</h1><SlotManager initialSlots={slots} /></div></main>;
}
