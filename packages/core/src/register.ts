import { asFunction, Lifetime, type AppContainer } from "./di/container";
import { createConsoleLogger, type Logger } from "./logger";

declare module "./di/container" {
  interface Cradle {
    /** Process-wide logger; redacts secrets from log context. */
    logger: Logger;
  }
}

export function registerCore(container: AppContainer): void {
  container.register({
    logger: asFunction(createConsoleLogger, { lifetime: Lifetime.SINGLETON }),
  });
}
