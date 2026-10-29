import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: fileURLToPath(new URL("..", import.meta.url)) });

async function importErrors(filePath: string, dependency: string) {
  const [result] = await eslint.lintText(`import * as dependency from "${dependency}"; void dependency;`, { filePath });
  expect(result).toBeDefined();
  return result!.messages.filter(({ ruleId }) => ruleId === "no-restricted-imports");
}

function boundaryErrors(packageName: string, dependency: string) {
  return importErrors(`packages/${packageName}/src/boundary-fixture.ts`, dependency);
}

describe("package boundary lint rules introduced by PR #2", () => {
  it.each([
    ["core", "@devmentor/ui/components/button"],
    ["core", "react"],
    ["core", "react-dom/client"],
    ["core", "next/server"],
    ["core", "@mikro-orm/core"],
    ["db", "@devmentor/app"],
    ["db", "@devmentor/ui/components/button"],
    ["db", "react/jsx-runtime"],
    ["db", "next/server"],
    ["ui", "@devmentor/app"],
    ["ui", "@devmentor/core"],
    ["ui", "@devmentor/db"],
    ["ui", "@mikro-orm/postgresql"],
    ["app", "@mikro-orm/postgresql"],
  ])("rejects %s importing %s", async (packageName, dependency) => {
    expect(await boundaryErrors(packageName, dependency)).toHaveLength(1);
  });

  it.each([
    ["core", "awilix"],
    ["core", "zod"],
    ["db", "@devmentor/core"],
    ["db", "@mikro-orm/postgresql"],
    ["ui", "react"],
    ["ui", "@devmentor/ui/components/button"],
    ["app", "@devmentor/core"],
    ["app", "@devmentor/db"],
    ["app", "@devmentor/ui/components/button"],
    ["app", "next/server"],
  ])("allows %s importing %s", async (packageName, dependency) => {
    expect(await boundaryErrors(packageName, dependency)).toEqual([]);
  });

  it("resolves Next.js lint rules against the app workspace", async () => {
    const config = await eslint.calculateConfigForFile("packages/app/src/app/backend/page.tsx");
    expect(config.settings.next.rootDir).toBe("packages/app/");
    expect(config.rules["@next/next/no-html-link-for-pages"][0]).toBe(2);
  });

  it.each([
    "packages/app/.next/server/page.js",
    "packages/app/out/index.html",
    "packages/app/build/output.js",
    "packages/app/next-env.d.ts",
    "packages/db/src/migrations/Migration20261013225312.ts",
    "coverage/index.html",
    "test-results/integration/browser.log",
  ])("ignores generated output %s", async (path) => {
    expect(await eslint.isPathIgnored(path)).toBe(true);
  });
});

describe("UI area lint rules (platform PD2/F3)", () => {
  const publicPage = "packages/app/src/app/(frontend)/sign-in/page.tsx";
  const publicKit = "packages/ui/src/frontend/feedback/Notice.tsx";
  const publicDomainComponent = "packages/ui/src/components/auth/SiteHeader.tsx";
  // Phase 2 public pieces: the form kit, the sign-up and check-email components and a page's
  // colocated client form.
  const publicFormKit = "packages/ui/src/frontend/forms/SchemaForm.tsx";
  const signUpForm = "packages/ui/src/components/auth/SignUpForm.tsx";
  const publicArea = [
    publicPage, "packages/app/src/app/site-header.tsx", "packages/app/src/app/welcome-notice.tsx", publicKit, publicDomainComponent,
    publicFormKit, signUpForm, "packages/ui/src/components/auth/CheckEmailNotice.tsx",
    "packages/app/src/app/(frontend)/sign-up/sign-up-form.tsx", "packages/app/src/app/(frontend)/confirm-email/page.tsx",
  ];

  it.each(publicArea.flatMap((file) => [
    [file, "@devmentor/ui/components/button"],
    [file, "@devmentor/ui/components/alert"],
    [file, "@devmentor/ui/backend/forms/CrudForm"],
    [file, "@devmentor/ui/backend/feedback/ErrorMessage"],
    [file, "@base-ui/react/button"],
    // Signed-in domain components built on shadcn.
    [file, "@devmentor/ui/components/auth/AccountSummary"],
    [file, "@devmentor/ui/components/mentors/SetupChecklist"],
    // A path that only starts like an allowed component.
    [file, "@devmentor/ui/components/auth/SiteHeaderWithCard"],
    [file, "@devmentor/ui/components/auth/SignUpFormCard"],
    // The signed-in form and its shadcn field primitives.
    [file, "@devmentor/ui/components/field"],
    [file, "@devmentor/ui/components/input"],
    [file, "@base-ui/react/field"],
  ]))("rejects the public-area file %s importing %s", async (file, dependency) => {
    expect(await importErrors(file, dependency)).toHaveLength(1);
  });

  it.each(publicArea.flatMap((file) => [
    [file, "@devmentor/ui/frontend/feedback/Notice"],
    [file, "@devmentor/ui/components/auth/SignInOptions"],
    [file, "@devmentor/ui/components/auth/WelcomeNotice"],
    [file, "@devmentor/ui/components/mentors/PriceList"],
    [file, "@devmentor/ui/components/auth/SignUpForm"],
    [file, "@devmentor/ui/components/auth/CheckEmailNotice"],
    [file, "@devmentor/ui/components/auth/ConfirmEmailPanel"],
    [file, "@devmentor/ui/frontend/forms/SchemaForm"],
    [file, "@devmentor/ui/frontend/forms/TextField"],
    [file, "@devmentor/ui/frontend/forms/PasswordField"],
    [file, "@devmentor/ui/frontend/forms/SubmitButton"],
    [file, "@devmentor/ui/frontend/actions/LinkButton"],
    [file, "@devmentor/ui/forms/useSchemaForm"],
    [file, "@devmentor/ui/forms/field-errors"],
    [file, "@devmentor/ui/api/apiCall"],
    [file, "@devmentor/ui/lib/utils"],
  ]))("allows the public-area file %s importing %s", async (file, dependency) => {
    expect(await importErrors(file, dependency)).toEqual([]);
  });

  it.each([
    [publicKit, "../../components/button"],
    [publicKit, "./LinkButton"],
    [publicDomainComponent, "../button"],
    [publicDomainComponent, "./AccountSummary"],
    // A relative path cannot smuggle a primitive in through the kit or a domain component.
    [publicFormKit, "../../components/input"],
    [publicFormKit, "./TextField"],
    [signUpForm, "./SignInOptions"],
    [signUpForm, "../../backend/forms/CrudForm"],
  ])("rejects relative imports in public ui code: %s importing %s", async (file, dependency) => {
    expect(await importErrors(file, dependency)).toHaveLength(1);
  });

  it.each([
    ["packages/app/src/app/(frontend)/page.tsx", "@mikro-orm/core"],
    [publicKit, "@devmentor/core"],
  ])("keeps the package boundary in the public area: %s importing %s", async (file, dependency) => {
    expect(await importErrors(file, dependency)).toHaveLength(1);
  });

  it.each([
    ["packages/app/src/app/(app)/account/account-name-form.tsx", "@devmentor/ui/components/alert"],
    ["packages/app/src/app/(app)/account/page.tsx", "@devmentor/ui/components/auth/AccountSummary"],
    ["packages/app/src/app/backend/layout.tsx", "@devmentor/ui/components/button"],
    ["packages/app/src/app/backend/users/users-panel.tsx", "@devmentor/ui/backend/tables/DataTable"],
    ["packages/ui/src/components/auth/AccountSummary.tsx", "@devmentor/ui/components/card"],
    ["packages/ui/src/backend/forms/CrudForm.tsx", "@devmentor/ui/components/button"],
    // Colocated tests and stories may compose any component.
    ["packages/ui/src/frontend/frontend.test.tsx", "../api/types"],
    ["packages/app/src/app/(frontend)/sign-in/page.test.tsx", "@devmentor/ui/components/button"],
  ])("allows signed-in, backend and test files %s importing %s", async (file, dependency) => {
    expect(await importErrors(file, dependency)).toEqual([]);
  });
});
