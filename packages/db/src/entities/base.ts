import { randomUUID } from "node:crypto";

import { p } from "@mikro-orm/core";

/** Columns every table gets. Spread into `defineEntity({ properties })`. */
export const baseProperties = {
  id: p.uuid().primary().onCreate(() => randomUUID()),
  createdAt: p.datetime().onCreate(() => new Date()),
  updatedAt: p
    .datetime()
    .onCreate(() => new Date())
    .onUpdate(() => new Date()),
};
