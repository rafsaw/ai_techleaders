import {
  CURRENCY,
  NotFoundError,
  toCents,
  type Money,
  type Cradle,
  type Principal,
} from "@devmentor/core";
import {
  mentorProfileIdSchema,
  type MentorArea,
  type MentorProfileInput,
} from "@devmentor/core/validators/mentors/mentor-profile.schema";
import {
  AvailabilitySlot,
  MentorProfile,
  PayoutAccount,
  UniqueConstraintViolationException,
  User,
  UserRole,
  type EntityManager,
} from "@devmentor/db";

export type MentorProfileDto = {
  id: string;
  area: MentorArea;
  description: string;
  publicWorkLinks: string[];
  prices: { 25: Money; 50: Money };
};

export type PublicMentorProfileDto = MentorProfileDto & {
  displayName: string;
  bookable: boolean;
};

export type MentorSetupDto = {
  profile: MentorProfileDto | null;
  payout: { status: "not_started" | "incomplete" | "pending" | "ready" | "blocked"; country: string | null; provisioningState: "pending" | "provisioned" | "reconciliation_required" | "failed" | null };
  upcomingSlots: { open: number; booked: number };
  bookable: boolean;
  publicUrl: string | null;
};

function toDto(profile: MentorProfile): MentorProfileDto {
  return {
    id: profile.id,
    area: profile.area,
    description: profile.description,
    publicWorkLinks: [...profile.publicWorkLinks],
    prices: {
      25: { amountMinor: profile.price25Cents, currency: CURRENCY },
      50: { amountMinor: profile.price50Cents, currency: CURRENCY },
    },
  };
}

function values(input: MentorProfileInput) {
  return {
    area: input.area,
    description: input.description,
    publicWorkLinks: input.publicWorkLinks,
    price25Cents: toCents(input.price25Dollars),
    price50Cents: toCents(input.price50Dollars),
  };
}

/** Profile persistence and Phase 1's single source of public visibility/setup state. */
export class MentorProfileService {
  private readonly em: EntityManager;
  private readonly clock: Cradle["clock"];

  constructor({ em, clock }: { em: EntityManager; clock: Cradle["clock"] }) {
    this.em = em;
    this.clock = clock;
  }

  async getOwn(principal: Principal): Promise<MentorProfileDto | null> {
    const profile = await this.em.findOne(MentorProfile, { user: principal.userId });
    return profile ? toDto(profile) : null;
  }

  /** First save inserts; later saves replace. A concurrent first insert retries as an update. */
  async save(principal: Principal, input: MentorProfileInput): Promise<MentorProfileDto> {
    try {
      return toDto(await this.#saveTransaction(principal.userId, input));
    } catch (error) {
      if (!(error instanceof UniqueConstraintViolationException)) throw error;
      return toDto(await this.#saveTransaction(principal.userId, input));
    }
  }

  async getPublic(profileId: string): Promise<PublicMentorProfileDto> {
    const parsedId = mentorProfileIdSchema.safeParse(profileId);
    if (!parsedId.success) throw new NotFoundError("Mentor profile not found");
    const profile = await this.em.findOne(MentorProfile, { id: parsedId.data }, { populate: ["user"] });
    if (!profile) throw new NotFoundError("Mentor profile not found");
    const mentorRole = await this.em.findOne(UserRole, { user: profile.user.id, role: "mentor" });
    if (!mentorRole) throw new NotFoundError("Mentor profile not found");
    const payout = await this.em.findOne(PayoutAccount, { mentorProfile: profile.id });
    return { ...toDto(profile), displayName: profile.user.name, bookable: payout?.provisioningState === "provisioned" && payout.status === "ready" };
  }

  async getSetup(principal: Principal): Promise<MentorSetupDto> {
    const profile = await this.getOwn(principal);
    const payout = profile ? await this.em.findOne(PayoutAccount, { mentorProfile: profile.id }) : null;
    const slots = profile ? await this.em.find(AvailabilitySlot, { mentorProfile: profile.id, startsAt: { $gt: this.clock.now() } }) : [];
    const booked = slots.filter((slot) => slot.bookedAt !== null).length;
    return {
      profile,
      payout: payout ? { status: payout.status, country: payout.country, provisioningState: payout.provisioningState } : { status: "not_started", country: null, provisioningState: null },
      upcomingSlots: { open: slots.length - booked, booked },
      bookable: !!profile && principal.roles.includes("mentor") && payout?.provisioningState === "provisioned" && payout.status === "ready",
      publicUrl: profile ? `/mentors/${profile.id}` : null,
    };
  }

  /** A saved profile, current mentor role and ready provisioned payout are all required. */
  async isBookable(profileId: string): Promise<boolean> {
    const profile = await this.em.findOne(MentorProfile, { id: profileId }, { populate: ["user"] });
    if (!profile) return false;
    const role = await this.em.findOne(UserRole, { user: profile.user.id, role: "mentor" });
    if (!role) return false;
    const payout = await this.em.findOne(PayoutAccount, { mentorProfile: profile.id });
    return payout?.provisioningState === "provisioned" && payout.status === "ready";
  }

  async #saveOnce(em: EntityManager, userId: string, input: MentorProfileInput): Promise<MentorProfile> {
    let profile = await em.findOne(MentorProfile, { user: userId });
    const next = values(input);
    if (profile) {
      Object.assign(profile, next);
    } else {
      profile = em.create(MentorProfile, { user: em.getReference(User, userId), ...next });
      em.persist(profile);
    }
    await em.flush();
    return profile;
  }

  #saveTransaction(userId: string, input: MentorProfileInput): Promise<MentorProfile> {
    return this.em.transactional((em) => this.#saveOnce(em, userId, input), { clear: true });
  }
}
