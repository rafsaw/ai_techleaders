import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Principal } from "@devmentor/core";
import { apiCall } from "@devmentor/ui/api/apiCall";

import { AccountNameForm } from "@/app/(app)/account/account-name-form";
import { ForgetWelcome } from "@/app/(app)/account/forget-welcome";
import AccountPage, { metadata } from "@/app/(app)/account/page";
import SignedInLayout from "@/app/(app)/layout";
import { navigateFully } from "@/app/full-navigation";
import { getPrincipal, requirePrincipal } from "@/server/auth/page-guards";
import type { AccountDto } from "@/server/services/auth/user.service";

const { getAccount, refresh } = vi.hoisted(() => ({ getAccount: vi.fn(), refresh: vi.fn() }));
vi.mock("@/server/auth/page-guards", () => ({ getPrincipal: vi.fn(), requirePrincipal: vi.fn() }));
vi.mock("@/server/container", () => ({ createRequestScope: () => ({ cradle: { userService: { getAccount } } }) }));
vi.mock("next/navigation", () => ({
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ refresh }),
}));
vi.mock("@devmentor/ui/api/apiCall", () => ({ apiCall: vi.fn() }));
vi.mock("@/app/full-navigation", () => ({ navigateFully: vi.fn() }));

const ada: Principal = { userId: "user-1", sessionId: "session-1", displayName: "Ada Lovelace", roles: ["mentee"] };
const account: AccountDto = {
  id: "user-1",
  email: "ada@example.com",
  displayName: "Ada Lovelace",
  roles: ["mentee"],
  signInMethods: { github: true, password: false },
};
const WELCOME = "This is the name others see. You can change it.";

beforeEach(() => {
  vi.mocked(getPrincipal).mockResolvedValue(ada);
  vi.mocked(requirePrincipal).mockResolvedValue(ada);
  getAccount.mockReset().mockResolvedValue(account);
  refresh.mockReset();
  vi.mocked(navigateFully).mockReset();
});

afterEach(() => window.history.replaceState(null, "", "/"));

function accountPage(searchParams: Record<string, string | string[] | undefined> = {}) {
  return AccountPage({ searchParams: Promise.resolve(searchParams) });
}

describe("(app) layout", () => {
  it("shows the signed-in header around the page", async () => {
    render(await SignedInLayout({ children: <main>Private content</main> }));
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: "Ada Lovelace" })).toHaveAttribute("href", "/account");
    expect(within(header).getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(screen.getByText("Private content")).toBeVisible();
  });

  it("shows the one-time welcome notice on a welcome=1 page other than /account (SM-AC7)", async () => {
    window.history.replaceState(null, "", "/settings?welcome=1&tab=x");
    render(await SignedInLayout({ children: <main>Private content</main> }));
    expect(screen.getByRole("status")).toHaveTextContent(WELCOME);
    expect(window.location.search).toBe("?tab=x");
  });

  it("leaves /account?welcome=1 to the page's own notice, so it shows once", async () => {
    window.history.replaceState(null, "", "/account?welcome=1");
    render(await SignedInLayout({ children: await accountPage({ welcome: "1" }) }));
    expect(screen.getAllByText(WELCOME)).toHaveLength(1);
    expect(window.location.pathname + window.location.search).toBe("/account");
  });

  it("renders no header when signed out and leaves the redirect to the page guard", async () => {
    vi.mocked(getPrincipal).mockResolvedValue(null);
    render(<>{await SignedInLayout({ children: <p>Page output</p> })}</>);
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.getByText("Page output")).toBeVisible();
  });
});

describe("/account", () => {
  it("guards with its own returnTo and reads the caller's account on the server", async () => {
    render(await accountPage());
    expect(requirePrincipal).toHaveBeenCalledWith({ returnTo: "/account" });
    expect(getAccount).toHaveBeenCalledWith("user-1");
    expect(metadata.title).toBe("Account");
    expect(screen.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Display name" })).toHaveValue("Ada Lovelace");
    expect(screen.getByText("ada@example.com")).toBeVisible();
    expect(screen.getByText("mentee")).toBeVisible();
    expect(screen.getByText("GitHub")).toBeVisible();
    expect(screen.queryByText(WELCOME)).not.toBeInTheDocument();
  });

  it("does not render for a signed-out visitor: the guard redirects first", async () => {
    vi.mocked(requirePrincipal).mockRejectedValue(new Error("redirect:/sign-in?returnTo=%2Faccount"));
    await expect(accountPage()).rejects.toThrow("redirect:/sign-in?returnTo=%2Faccount");
    expect(getAccount).not.toHaveBeenCalled();
  });

  it("lists every role and both sign-in methods", async () => {
    getAccount.mockResolvedValue({ ...account, roles: ["mentee", "mentor"], signInMethods: { github: true, password: true } });
    render(await accountPage());
    expect(screen.getByText("mentor")).toBeVisible();
    expect(screen.getByText("GitHub, Email and password")).toBeVisible();
  });

  it("shows the welcome notice once and drops ?welcome=1 from the address", async () => {
    window.history.replaceState(null, "", "/account?welcome=1");
    render(await accountPage({ welcome: "1" }));
    expect(screen.getByRole("status")).toHaveTextContent(WELCOME);
    expect(`${window.location.pathname}${window.location.search}`).toBe("/account");
  });

  it.each([{ welcome: "0" }, { welcome: ["1", "1"] }])("shows no notice for %j", async (searchParams) => {
    render(await accountPage(searchParams));
    expect(screen.queryByText(WELCOME)).not.toBeInTheDocument();
  });
});

describe("ForgetWelcome", () => {
  it("replaces the address with the given path and keeps the router state", () => {
    window.history.replaceState({ router: "state" }, "", "/account?welcome=1#top");
    render(<ForgetWelcome path="/account" />);
    expect(window.location.href).toBe(`${window.location.origin}/account`);
    expect(window.history.state).toEqual({ router: "state" });
  });
});

describe("AccountNameForm", () => {
  function save(name: string) {
    fireEvent.change(screen.getByRole("textbox", { name: "Display name" }), { target: { value: name } });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));
  }

  it("saves the trimmed name, keeps it in the field, confirms and refreshes the header", async () => {
    vi.mocked(apiCall).mockResolvedValue({ ok: true, data: { ...account, displayName: "Ada King" } });
    render(<AccountNameForm displayName="Ada Lovelace" />);
    save("  Ada King ");
    expect(await screen.findByRole("status")).toHaveTextContent("Name saved");
    expect(apiCall).toHaveBeenCalledWith("/api/account", { method: "PATCH", body: { displayName: "Ada King" } });
    expect(screen.getByRole("textbox", { name: "Display name" })).toHaveValue("  Ada King ");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("validates an empty name without calling the API", async () => {
    render(<AccountNameForm displayName="Ada Lovelace" />);
    save("   ");
    expect(await screen.findByText("Display name is required")).toBeVisible();
    expect(apiCall).not.toHaveBeenCalled();
    expect(screen.queryByText("Name saved")).not.toBeInTheDocument();
  });

  it("hides the confirmation while saving again and shows a server failure", async () => {
    vi.mocked(apiCall).mockResolvedValueOnce({ ok: true, data: account });
    render(<AccountNameForm displayName="Ada Lovelace" />);
    save("Ada");
    expect(await screen.findByText("Name saved")).toBeVisible();

    let fail!: (value: Awaited<ReturnType<typeof apiCall>>) => void;
    vi.mocked(apiCall).mockReturnValueOnce(new Promise((resolve) => { fail = resolve; }));
    save("Ada B");
    await waitFor(() => expect(screen.queryByText("Name saved")).not.toBeInTheDocument());
    await act(async () => fail({ ok: false, error: { code: "internal_error", message: "Something went wrong" } }));
    expect(screen.getByText("Could not save")).toBeVisible();
    expect(screen.getByText("Something went wrong")).toBeVisible();
    expect(refresh).toHaveBeenCalledOnce();
    expect(navigateFully).not.toHaveBeenCalled();
  });

  it("on 401 discards the unsaved name and fully navigates to sign-in with the session-expired banner (SM-AC2)", async () => {
    vi.mocked(apiCall).mockResolvedValue({ ok: false, error: { code: "unauthorized", message: "Authentication required" } });
    render(<AccountNameForm displayName="Ada Lovelace" />);
    save("Ada King");
    await waitFor(() => expect(navigateFully).toHaveBeenCalledWith("/sign-in?error=session_expired&returnTo=%2Faccount"));
    expect(screen.queryByText("Could not save")).not.toBeInTheDocument();
    expect(screen.queryByText("Name saved")).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
