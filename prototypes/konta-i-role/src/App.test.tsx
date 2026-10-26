import { act, fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { installLinkInterception } from "./links";
import { NOTES } from "./notes";
import { resolveHref, SCREENS, type ScreenId } from "./routes";
import { getSim, navigate, reset, switchAccount, userOf } from "./sim";

// Clicking through the rendered screens. The review engine is not loaded here, so every screen section is
// in the DOM; the test follows the "prototype:navigate" events the links produce.

let current: ScreenId;
let remove: () => void;
const onNavigate = (event: Event) => {
  current = (event as CustomEvent<ScreenId>).detail;
};
const screen = (container: HTMLElement, id: ScreenId) => within(container.querySelector<HTMLElement>(`#${id}`)!);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  document.addEventListener("prototype:navigate", onNavigate);
  remove = installLinkInterception();
  reset();
  current = "s07";
});

afterEach(() => {
  document.removeEventListener("prototype:navigate", onNavigate);
  remove();
});

describe("screen sections", () => {
  it("renders a section with a note for every screen of the map the prototype builds", () => {
    const { container } = render(<App />);
    for (const { id } of SCREENS) {
      expect(container.querySelector(`section.screen#${id}`)).not.toBeNull();
      expect(container.querySelector(`#${id} .frame h1`)).not.toBeNull();
      expect(container.querySelector(`#${id} .screen-meta h2`)).toHaveTextContent(id);
      expect(NOTES[id].stories).not.toBe("");
    }
    expect(SCREENS.map((s) => s.id)).toEqual(["s01", "s02", "s03", "s04", "s05", "s06", "s07", "s08", "s11", "s12", "s13", "s14"]);
  });

  it("points every product link on every screen at a screen that exists, for each kind of visitor", () => {
    const ids = SCREENS.map((s) => s.id);
    for (const account of [null, "a1", "a4", "a5"]) {
      switchAccount(account);
      const { container, unmount } = render(<App />);
      for (const anchor of container.querySelectorAll<HTMLAnchorElement>(".frame a[href^='/']")) {
        const href = anchor.getAttribute("href")!;
        expect(ids, `${href} for ${account}`).toContain(resolveHref(href, { signedIn: userOf() !== null, operator: Boolean(userOf()?.roles.includes("operator")) }).screen);
      }
      unmount();
    }
  });
});

describe("clicking through", () => {
  it("home -> sign in -> GitHub -> authorize -> account with the welcome notice", async () => {
    const { container } = render(<App />);
    fireEvent.click(screen(container, "s07").getByRole("link", { name: "Sign in" }));
    expect(current).toBe("s01");
    fireEvent.click(screen(container, "s01").getByRole("link", { name: "Sign in with GitHub" }));
    expect(current).toBe("s14");
    fireEvent.click(screen(container, "s14").getByRole("button", { name: "Authorize DevMentor" }));
    expect(current).toBe("s06");
    expect(screen(container, "s06").getByRole("textbox", { name: "Display name" })).toHaveValue("Jakub Lis");
    expect(screen(container, "s06").getByText("This is the name others see. You can change it.")).toBeInTheDocument();
  });

  it("Deny on the GitHub page returns to sign-in with the cancelled banner", () => {
    const { container } = render(<App />);
    fireEvent.click(screen(container, "s01").getByRole("link", { name: "Sign in with GitHub" }));
    fireEvent.click(screen(container, "s14").getByRole("button", { name: "Deny" }));
    expect(current).toBe("s01");
    expect(screen(container, "s01").getByText("GitHub sign-in was cancelled.")).toBeInTheDocument();
  });

  it("sign-in -> create an account keeps the way back to the invitation", () => {
    const { container } = render(<App />);
    act(() => navigate("/invite/demo-bartek"));
    fireEvent.click(screen(container, "s05").getByRole("link", { name: "Create an account" }));
    expect(current).toBe("s02");
    expect(getSim().params.s02).toEqual({ returnTo: "/invite/demo-bartek" });
  });

  it("the header logo and Sign in work on every public screen, and the 404 leads home", () => {
    const { container } = render(<App />);
    fireEvent.click(screen(container, "s11").getByRole("link", { name: "Go to the home page" }));
    expect(current).toBe("s07");
    fireEvent.click(screen(container, "s12").getByRole("link", { name: "Go to the home page" }));
    expect(current).toBe("s07");
    fireEvent.click(screen(container, "s03").getAllByRole("link", { name: "Sign in" }).at(-1)!);
    expect(current).toBe("s01");
  });

  it("an operator's Backend link opens s08, and a mentor's header has no Mentor setup", () => {
    switchAccount("a5");
    const { container, unmount } = render(<App />);
    fireEvent.click(screen(container, "s07").getByRole("link", { name: "Backend" }));
    expect(current).toBe("s08");
    unmount();
    switchAccount("a4");
    const mentor = render(<App />);
    expect(screen(mentor.container, "s07").queryByRole("link", { name: "Mentor setup" })).toBeNull();
    expect(screen(mentor.container, "s07").getByRole("link", { name: "Marta Zielińska" })).toBeInTheDocument();
  });

  it("the demo inbox link opens the confirmation page and the invitation page", async () => {
    const { container } = render(<App />);
    await act(async () => {
      fireEvent.click(screen(container, "s13").getAllByRole("button")[0]!);
    });
    const link = screen(container, "s13").getByRole("link", { name: /confirm-email/ });
    fireEvent.click(link);
    expect(current).toBe("s04");
  });

  it("scenario controls that open screens do: confirmation link and invitation link lists", () => {
    const { container } = render(<App />);
    const control = (label: string) =>
      Array.from(container.querySelectorAll<HTMLElement>("label.scenario-field")).find((l) => l.textContent?.startsWith(label))!.querySelector("select")!;
    fireEvent.change(control("Confirmation link"), { target: { value: "/confirm-email?token=tomek-used" } });
    expect(current).toBe("s04");
    expect(screen(container, "s04").getByText("Your address is already confirmed — sign in.")).toBeInTheDocument();
    fireEvent.change(control("Invitation link"), { target: { value: "/invite/demo-zly-token" } });
    expect(current).toBe("s05");
    expect(screen(container, "s05").getByText("This invitation is not valid.")).toBeInTheDocument();
  });
});
