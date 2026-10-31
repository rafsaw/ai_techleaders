import {
  CURRENCY,
  NotFoundError,
  toCents,
  type Money,
  type Principal,
} from "@devmentor/core";
import type { MentorArea, MentorProfileInput } from "@devmentor/core/validators/mentors/mentor-profile.schema";
import {
  MentorProfile,
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
  payout: { status: "not_started"; country: null; provisioningState: null };
  upcomingSlots: { open: 0; booked: 0 };
  bookable: false;
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

  constructor({ em }: { em: EntityManager }) {
    this.em = em;
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
    const profile = await this.em.findOne(MentorProfile, { id: profileId }, { populate: ["user"] });
    if (!profile) throw new NotFoundError("Mentor profile not found");
    const mentorRole = await this.em.findOne(UserRole, { user: profile.user.id, role: "mentor" });
    if (!mentorRole) throw new NotFoundError("Mentor profile not found");
    return { ...toDto(profile), displayName: profile.user.name, bookable: await this.isBookable(profile.id) };
  }

  async getSetup(principal: Principal): Promise<MentorSetupDto> {
    const profile = await this.getOwn(principal);
    return {
      profile,
      payout: { status: "not_started", country: null, provisioningState: null },
      upcomingSlots: { open: 0, booked: 0 },
      bookable: false,
      publicUrl: profile ? `/mentors/${profile.id}` : null,
    };
  }

  /** Phase 1 has no payout account, so no profile can be bookable yet. */
  async isBookable(profileId: string): Promise<false> {
    void profileId;
    return false;
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
