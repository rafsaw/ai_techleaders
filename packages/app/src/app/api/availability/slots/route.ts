import { parseInput, readJsonBody } from "@devmentor/core";
import { slotCreateSchema } from "@devmentor/core/validators/availability/slot-create.schema";
import { z } from "zod";

import { apiHandler } from "@/server/http";

const idSchema = z.object({ id: z.uuid() });
const options = { access: { role: "mentor" } as const, logRoute: "/api/availability/slots" };

export const POST = apiHandler(
  async ({ req, cradle, principal }) => {
    const { startsAt } = parseInput(slotCreateSchema, await readJsonBody(req));
    return cradle.slotService.publish(principal, startsAt);
  },
  { ...options, status: 201 },
);

export const DELETE = apiHandler(
  async ({ req, cradle, principal }) => {
    const { id } = parseInput(idSchema, { id: new URL(req.url).searchParams.get("id") });
    await cradle.slotService.withdraw(principal, id);
    return { id };
  },
  options,
);
