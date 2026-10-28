import { ConflictError, NotFoundError, type Cradle } from "@devmentor/core";
import type { Role } from "@devmentor/core/validators/auth/role.schema";
import type { UserCreateInput } from "@devmentor/core/validators/auth/user-create.schema";
import { UniqueConstraintViolationException, User, UserRole, type EntityManager } from "@devmentor/db";

/** What the API returns for a user; never the entity itself. */
export type UserDto = { id: string; email: string; name: string; createdAt: string };

/** The signed-in person's own account. `User.name` is the display name. */
export type AccountDto = {
  id: string;
  email: string;
  displayName: string;
  roles: Role[];
  signInMethods: { github: boolean; password: boolean };
};

function toDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}

function toAccountDto(user: User, roles: Role[]): AccountDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.name,
    roles,
    // Password sign-in arrives with Phase 2 (`password_hash`); until then no
    // account has a password.
    signInMethods: { github: user.githubId != null, password: false },
  };
}

export class UserService {
  private readonly em: EntityManager;
  private readonly roleService: Cradle["roleService"];

  constructor({ em, roleService }: Pick<Cradle, "em" | "roleService">) {
    this.em = em;
    this.roleService = roleService;
  }

  count(): Promise<number> {
    return this.em.count(User);
  }

  async list(): Promise<UserDto[]> {
    const users = await this.em.find(User, {}, { orderBy: { createdAt: "desc" } });
    return users.map(toDto);
  }

  /** Creates a user holding `mentee`; the user and the role row share one flush. */
  async create(input: UserCreateInput): Promise<UserDto> {
    const user = this.em.create(User, { email: input.email, name: input.name });
    const mentee = this.em.create(UserRole, { user, role: "mentee" });
    try {
      await this.em.persist([user, mentee]).flush();
    } catch (error) {
      // The unique index decides, so two concurrent creates can't both succeed.
      if (error instanceof UniqueConstraintViolationException) {
        throw new ConflictError("A user with this email already exists", { cause: error });
      }
      throw error;
    }
    return toDto(user);
  }

  /** The user with `email` (already normalized to lower case), or `NotFoundError`. */
  async findByEmail(email: string): Promise<UserDto> {
    const user = await this.em.findOne(User, { email });
    if (!user) throw new NotFoundError(`No account with the email ${email}`);
    return toDto(user);
  }

  /** The account of `userId` (a trusted principal's id), with its live roles. */
  async getAccount(userId: string): Promise<AccountDto> {
    const user = await this.#findUser(userId);
    return toAccountDto(user, await this.roleService.rolesOf(user.id));
  }

  /** Changes the display name. `displayName` is already validated and trimmed. */
  async updateDisplayName(userId: string, displayName: string): Promise<AccountDto> {
    const user = await this.#findUser(userId);
    user.name = displayName;
    await this.em.flush();
    return toAccountDto(user, await this.roleService.rolesOf(user.id));
  }

  async #findUser(userId: string): Promise<User> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) throw new NotFoundError("Account not found");
    return user;
  }
}
