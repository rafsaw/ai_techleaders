import { assertOwner, ConflictError, NotFoundError, ValidationError, type Cradle, type Principal } from "@devmentor/core";
import { MIN_LEAD_MINUTES, SLOT_BLOCK_MINUTES } from "@devmentor/core/validators/availability/slot-create.schema";
import { AvailabilitySlot, LockMode, MentorProfile, UniqueConstraintViolationException, type EntityManager } from "@devmentor/db";

export type SlotDto = { id: string; startsAt: string; booked: boolean };

function toDto(slot: AvailabilitySlot): SlotDto {
  return { id: slot.id, startsAt: slot.startsAt.toISOString(), booked: slot.bookedAt !== null };
}

function overlap(start: Date): ConflictError {
  return new ConflictError(`This overlaps your slot at ${start.toISOString()}. Each slot reserves 50 minutes.`);
}

export class SlotService {
  private readonly em: EntityManager;
  private readonly clock: Cradle["clock"];

  constructor({ em, clock }: { em: EntityManager; clock: Cradle["clock"] }) {
    this.em = em;
    this.clock = clock;
  }

  async listUpcoming(principal: Principal): Promise<SlotDto[]> {
    const slots = await this.em.find(AvailabilitySlot, {
      mentorProfile: { user: principal.userId }, startsAt: { $gt: this.clock.now() },
    }, { orderBy: { startsAt: "asc" } });
    return slots.map(toDto);
  }

  async publish(principal: Principal, startsAt: string): Promise<SlotDto> {
    const start = new Date(startsAt);
    try {
      return await this.em.transactional(async (em) => {
        const profile = await em.findOne(MentorProfile, { user: principal.userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
        if (!profile) throw new NotFoundError("Mentor profile not found");
        if (start.getTime() < this.clock.now().getTime() + MIN_LEAD_MINUTES * 60_000) {
          throw new ValidationError({ startsAt: ["Pick a time at least 2 hours from now. Mentees need 2 hours' notice."] });
        }
        const block = SLOT_BLOCK_MINUTES * 60_000;
        const existing = await em.findOne(AvailabilitySlot, {
          mentorProfile: profile.id,
          startsAt: { $gt: new Date(start.getTime() - block), $lt: new Date(start.getTime() + block) },
        }, { orderBy: { startsAt: "asc" } });
        if (existing) throw overlap(existing.startsAt);
        const slot = em.create(AvailabilitySlot, { mentorProfile: profile, startsAt: start, bookedAt: null });
        em.persist(slot);
        await em.flush();
        return toDto(slot);
      }, { clear: true });
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) throw overlap(start);
      throw error;
    }
  }

  async withdraw(principal: Principal, slotId: string): Promise<void> {
    const slot = await this.em.findOne(AvailabilitySlot, { id: slotId }, { populate: ["mentorProfile.user"] });
    if (!slot) throw new NotFoundError();
    assertOwner(principal, slot.mentorProfile.user.id);
    const deleted = await this.em.nativeDelete(AvailabilitySlot, { id: slotId, bookedAt: null });
    if (!deleted) throw new ConflictError("This slot is booked. To cancel, the mentee or you contact the DevMentor team by email.");
  }
}
