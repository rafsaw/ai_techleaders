"use client";

import { useState, useSyncExternalStore } from "react";
import { apiCall } from "@devmentor/ui/api/apiCall";
import { SlotList } from "@devmentor/ui/components/availability/SlotList";
import { SlotRow } from "@devmentor/ui/components/availability/SlotRow";
import { unlessSessionExpired } from "@/app/session-expiry";
import type { SlotDto } from "@/server/services/availability/slot.service";
import { LocalTime } from "./local-time";
import { SlotForm } from "./slot-form";

const subscribe = () => () => {};
const clientZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverZone = () => "your local time";

export function SlotManager({ initialSlots }: { initialSlots: SlotDto[] }) {
  const [slots, setSlots] = useState(initialSlots);
  const timeZone = useSyncExternalStore(subscribe, clientZone, serverZone);
  return (
    <div className="flex max-w-text flex-col gap-component">
      <SlotForm timeZone={timeZone} onPublished={(slot) => setSlots((current) => [...current, slot].sort((a, b) => a.startsAt.localeCompare(b.startsAt)))} />
      <SlotList count={slots.length}>
        {slots.map((slot) => <SlotRow key={slot.id} timeZone={timeZone} booked={slot.booked} remove={async () => {
          const result = await unlessSessionExpired(await apiCall(`/api/availability/slots?id=${encodeURIComponent(slot.id)}`, { method: "DELETE" }), "/mentor/slots");
          if (result.ok) setSlots((current) => current.filter((item) => item.id !== slot.id));
          return result;
        }}><LocalTime instant={slot.startsAt} /></SlotRow>)}
      </SlotList>
    </div>
  );
}
