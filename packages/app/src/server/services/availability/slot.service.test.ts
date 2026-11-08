import { ConflictError, fixedClock, NotFoundError, ValidationError, type Principal } from "@devmentor/core";
import { MIN_LEAD_MINUTES } from "@devmentor/core/validators/availability/slot-create.schema";
import { AvailabilitySlot, LockMode, MentorProfile, UniqueConstraintViolationException, type EntityManager } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";
import { SlotService } from "./slot.service";

const principal: Principal = { userId: "u1", sessionId: "s1", displayName: "Ada", roles: ["mentor"] };
const now = "2026-10-31T00:00:00.000Z";
const start = "2026-10-31T02:00:00.000Z";
const profile = { id: "p1", user: { id: "u1" } };
const slot = (time = start, bookedAt: Date | null = null) => ({ id: "slot1", mentorProfile: profile, startsAt: new Date(time), bookedAt });

const publicProfileId = "11111111-1111-4111-8111-111111111111";
/** The earliest start a read at `now` may show: exactly two hours ahead. */
const cutoff = new Date(new Date(now).getTime() + MIN_LEAD_MINUTES * 60_000);
const fromCutoff = (offsetMinutes: number) => new Date(cutoff.getTime() + offsetMinutes * 60_000);
type Row = { id: string; mentorProfile: string; startsAt: Date; bookedAt: Date | null };
const row = (id: string, startsAt: Date, overrides: Partial<Row> = {}): Row =>
  ({ id, mentorProfile: publicProfileId, startsAt, bookedAt: null, ...overrides });

/** Applies the service's own where/orderBy the way the database would, so the filter is what is under test. */
function queryRows(rows: Row[]) {
  return async (
    _entity: unknown,
    where: { mentorProfile: string; bookedAt: null; startsAt: { $gte: Date } },
    options: { orderBy: Record<string, "asc"> },
  ) => {
    const keys = Object.keys(options.orderBy);
    const sortKey = (candidate: Row) => keys.map((key) => (key === "startsAt" ? candidate.startsAt.toISOString() : candidate.id)).join("|");
    return rows
      .filter((candidate) => candidate.mentorProfile === where.mentorProfile
        && candidate.bookedAt === where.bookedAt
        && candidate.startsAt.getTime() >= where.startsAt.$gte.getTime())
      .sort((left, right) => (sortKey(left) < sortKey(right) ? -1 : 1));
  };
}
function setup() {
  const tx = {
    findOne: vi.fn().mockResolvedValueOnce(profile).mockResolvedValue(null),
    create: vi.fn((_entity, data) => ({ id: "slot1", ...data })),
    persist: vi.fn(), flush: vi.fn().mockResolvedValue(undefined),
  };
  const em = {
    transactional: vi.fn((callback) => callback(tx)),
    find: vi.fn().mockResolvedValue([]), findOne: vi.fn(), nativeDelete: vi.fn().mockResolvedValue(1),
  };
  return { tx, em, service: new SlotService({ em: em as unknown as EntityManager, clock: fixedClock(now) }) };
}

describe("SlotService", () => {
  it("lists only the caller's future slots in start order as DTOs", async () => {
    const { em, service } = setup();
    em.find.mockResolvedValue([slot(start), slot("2026-10-31T03:00:00Z", new Date(now))]);
    await expect(service.listUpcoming(principal)).resolves.toEqual([
      { id: "slot1", startsAt: start, booked: false },
      { id: "slot1", startsAt: "2026-10-31T03:00:00.000Z", booked: true },
    ]);
    expect(em.find).toHaveBeenCalledWith(AvailabilitySlot, { mentorProfile: { user: "u1" }, startsAt: { $gt: new Date(now) } }, { orderBy: { startsAt: "asc" } });
  });

  it.each([start, "2027-10-31T02:00:00.000Z"])("publishes %s after locking before overlap lookup", async (time) => {
    const { tx, em, service } = setup();
    await expect(service.publish(principal, time)).resolves.toEqual({ id: "slot1", startsAt: time, booked: false });
    expect(tx.findOne).toHaveBeenNthCalledWith(1, MentorProfile, { user: "u1" }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    expect(tx.findOne).toHaveBeenNthCalledWith(2, AvailabilitySlot, { mentorProfile: "p1", startsAt: { $gt: new Date(new Date(time).getTime() - 50 * 60_000), $lt: new Date(new Date(time).getTime() + 50 * 60_000) } }, { orderBy: { startsAt: "asc" } });
    expect(tx.persist).toHaveBeenCalledOnce();
    expect(tx.flush).toHaveBeenCalledOnce();
    expect(em.transactional).toHaveBeenCalledWith(expect.any(Function), { clear: true });
  });

  it("rejects a start one minute short and requires a profile before publishing", async () => {
    const s = setup();
    await expect(s.service.publish(principal, "2026-10-31T01:59:00Z")).rejects.toEqual(new ValidationError({ startsAt: ["Pick a time at least 2 hours from now. Mentees need 2 hours' notice."] }));
    expect(s.tx.findOne).toHaveBeenCalledOnce();
    const missing = setup(); missing.tx.findOne.mockReset().mockResolvedValue(null);
    await expect(missing.service.publish(principal, start)).rejects.toEqual(new ConflictError("Save your profile first"));
    expect(missing.tx.create).not.toHaveBeenCalled();
    expect(missing.tx.persist).not.toHaveBeenCalled();
  });

  it.each([-49, 49])("reports the existing slot at offset %i minutes", async (offset) => {
    const s = setup();
    const existing = slot(new Date(new Date(start).getTime() + offset * 60_000).toISOString());
    s.tx.findOne.mockReset().mockResolvedValueOnce(profile).mockResolvedValueOnce(existing);
    await expect(s.service.publish(principal, start)).rejects.toEqual(new ConflictError(`This overlaps your slot at ${existing.startsAt.toISOString()}. Each slot reserves 50 minutes.`));
    expect(s.tx.persist).not.toHaveBeenCalled();
  });

  it.each([-50, 50])("allows an adjacent slot at offset %i minutes", async (offset) => {
    const s = setup();
    const adjacent = new Date(new Date(start).getTime() + offset * 60_000);
    s.tx.findOne.mockReset().mockResolvedValueOnce(profile).mockImplementationOnce(async (_entity, where) => {
      const bounds = where.startsAt as { $gt: Date; $lt: Date };
      return adjacent > bounds.$gt && adjacent < bounds.$lt ? slot(adjacent.toISOString()) : null;
    });
    await expect(s.service.publish(principal, start)).resolves.toMatchObject({ startsAt: start });
  });

  it("maps a unique-index conflict and propagates other failures", async () => {
    const s = setup();
    s.em.transactional.mockRejectedValueOnce(new UniqueConstraintViolationException(new Error("duplicate")));
    await expect(s.service.publish(principal, start)).rejects.toEqual(new ConflictError(`This overlaps your slot at ${start}. Each slot reserves 50 minutes.`));
    const failure = new Error("db down"); s.em.transactional.mockRejectedValueOnce(failure);
    await expect(s.service.publish(principal, start)).rejects.toBe(failure);
  });

  it("withdraws only an owned, still-open slot", async () => {
    const s = setup(); s.em.findOne.mockResolvedValue(slot());
    await expect(s.service.withdraw(principal, "slot1")).resolves.toBeUndefined();
    expect(s.em.findOne).toHaveBeenCalledWith(AvailabilitySlot, { id: "slot1" }, { populate: ["mentorProfile.user"] });
    expect(s.em.nativeDelete).toHaveBeenCalledWith(AvailabilitySlot, { id: "slot1", bookedAt: null });
    s.em.nativeDelete.mockResolvedValueOnce(0);
    await expect(s.service.withdraw(principal, "slot1")).rejects.toEqual(new ConflictError("This slot is booked. To cancel, the mentee or you contact the DevMentor team by email."));
  });

  it("conceals unknown and foreign slots before deletion", async () => {
    const s = setup(); s.em.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...slot(), mentorProfile: { user: { id: "other" } } });
    await expect(s.service.withdraw(principal, "unknown")).rejects.toEqual(new NotFoundError());
    await expect(s.service.withdraw(principal, "foreign")).rejects.toEqual(new NotFoundError());
    expect(s.em.nativeDelete).not.toHaveBeenCalled();
  });

  describe("listPublicAvailable", () => {
    it.each(["", "p1", "not-a-uuid", `${publicProfileId}1`, "11111111-1111-4111-8111-11111111111"])(
      "answers the neutral 404 for id %j without reaching the database",
      async (id) => {
        const { em, service } = setup();
        await expect(service.listPublicAvailable(id)).rejects.toEqual(new NotFoundError("Mentor profile not found"));
        expect(em.find).not.toHaveBeenCalled();
      },
    );

    it("returns only this mentor's open starts at or after the read-time cutoff, by start then id", async () => {
      const { em, service } = setup();
      em.find.mockImplementation(queryRows([
        row("later", fromCutoff(60)),
        row("tie-b", cutoff),
        row("tie-a", cutoff),
        row("one-minute-short", fromCutoff(-1)),
        row("already-past", new Date(new Date(now).getTime() - 60_000)),
        row("booked", fromCutoff(30), { bookedAt: new Date(now) }),
        row("other-mentor", cutoff, { mentorProfile: "22222222-2222-4222-8222-222222222222" }),
      ]));

      await expect(service.listPublicAvailable(publicProfileId)).resolves.toEqual([
        { id: "tie-a", startsAt: cutoff.toISOString() },
        { id: "tie-b", startsAt: cutoff.toISOString() },
        { id: "later", startsAt: fromCutoff(60).toISOString() },
      ]);
      expect(em.find).toHaveBeenCalledWith(
        AvailabilitySlot,
        { mentorProfile: publicProfileId, bookedAt: null, startsAt: { $gte: cutoff } },
        { orderBy: { startsAt: "asc", id: "asc" } },
      );
    });

    it.each([[0, true], [-1, false], [1, true], [-MIN_LEAD_MINUTES, false]])(
      "treats a start %i minutes from the two-hour mark as eligible: %s",
      async (offsetMinutes, eligible) => {
        const { em, service } = setup();
        em.find.mockImplementation(queryRows([row("only", fromCutoff(offsetMinutes))]));
        await expect(service.listPublicAvailable(publicProfileId)).resolves.toEqual(
          eligible ? [{ id: "only", startsAt: fromCutoff(offsetMinutes).toISOString() }] : [],
        );
      },
    );

    it("caps nothing on a long schedule and exposes no duration, price or booked flag", async () => {
      const { em, service } = setup();
      const rows = Array.from({ length: 25 }, (_, index) => row(`s${String(index).padStart(2, "0")}`, fromCutoff(index * 60)));
      em.find.mockImplementation(queryRows([...rows].reverse()));

      const result = await service.listPublicAvailable(publicProfileId);
      expect(result).toHaveLength(rows.length);
      expect(result.map((item) => item.id)).toEqual(rows.map((candidate) => candidate.id));
      expect(result.flatMap((item) => Object.keys(item))).toEqual(rows.flatMap(() => ["id", "startsAt"]));
    });

    it("reports an empty schedule as an empty list rather than a 404", async () => {
      const { em, service } = setup();
      em.find.mockImplementation(queryRows([]));
      await expect(service.listPublicAvailable(publicProfileId)).resolves.toEqual([]);
    });
  });
});
