import { z } from "zod";

/** A slot reserves one longest supported session block. */
export const SLOT_BLOCK_MINUTES = 50;

/** Slots must be published at least this far ahead. */
export const MIN_LEAD_MINUTES = 120;

const slotStartSchema = z.iso.datetime({ offset: true }).refine((value) => {
  const seconds = value.slice(17, 19);
  const fraction = value.match(/\.(\d+)/)?.[1];
  return seconds === "00" && (!fraction || /^0+$/.test(fraction));
}, "Start time must be on a whole minute").transform((value) => new Date(value).toISOString());

/** An offset-bearing instant on a whole minute, normalized to UTC. */
export const slotCreateSchema = z.object({ startsAt: slotStartSchema });
export type SlotCreateInput = z.output<typeof slotCreateSchema>;
