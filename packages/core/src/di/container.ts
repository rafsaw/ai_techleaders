import {
  aliasTo,
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
  Lifetime,
  type AwilixContainer,
} from "awilix";

/**
 * Registry of everything resolvable from the DI container.
 *
 * Intentionally empty here: each package that contributes dependencies
 * extends it via declaration merging, e.g.
 *
 * ```ts
 * declare module "@devmentor/core" {
 *   interface Cradle {
 *     orm: MikroORM;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Cradle {}

export type AppContainer = AwilixContainer<Cradle>;

export function createAppContainer(): AppContainer {
  return createContainer<Cradle>({
    // PROXY mode: constructors/factories receive the cradle and destructure
    // what they need, which survives minification (unlike CLASSIC).
    injectionMode: InjectionMode.PROXY,
    // Fail fast on unregistered names and on lifetime leaks
    // (e.g. a singleton depending on a scoped registration).
    strict: true,
  });
}

export { aliasTo, asClass, asFunction, asValue, Lifetime };
