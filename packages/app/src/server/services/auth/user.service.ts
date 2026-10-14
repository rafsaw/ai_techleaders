import { ConflictError, type Cradle } from "@devmentor/core";
import type { UserCreateInput } from "@devmentor/core/validators/auth/user-create.schema";
import { UniqueConstraintViolationException, User, type EntityManager } from "@devmentor/db";

/** What the API returns for a user; never the entity itself. */
export type UserDto = { id: string; email: string; name: string; createdAt: string };

function toDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}

export class UserService {
  private readonly em: EntityManager;

  constructor({ em }: Pick<Cradle, "em">) {
    this.em = em;
  }

  count(): Promise<number> {
    return this.em.count(User);
  }

  async list(): Promise<UserDto[]> {
    const users = await this.em.find(User, {}, { orderBy: { createdAt: "desc" } });
    return users.map(toDto);
  }

  async create(input: UserCreateInput): Promise<UserDto> {
    const user = this.em.create(User, { email: input.email, name: input.name });
    try {
      await this.em.persist(user).flush();
    } catch (error) {
      // The unique index decides, so two concurrent creates can't both succeed.
      if (error instanceof UniqueConstraintViolationException) {
        throw new ConflictError("A user with this email already exists", { cause: error });
      }
      throw error;
    }
    return toDto(user);
  }
}
