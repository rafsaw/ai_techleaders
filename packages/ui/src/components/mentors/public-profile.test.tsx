import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AREA_LABELS, MentorProfileHeader } from "./MentorProfileHeader";
import { NOT_BOOKABLE, NotBookableNotice } from "./NotBookableNotice";
import { PriceList } from "./PriceList";
import { linkLabel, PublicWorkLinks } from "./PublicWorkLinks";
import { TEXT_ONLY, TextOnlyNote } from "./TextOnlyNote";

describe("public mentor profile", () => {
  it("shows the name as the page heading, the area and the description as plain text", () => {
    const { container } = render(
      <MentorProfileHeader displayName="Ada Nowak" area="python" description={"Line one\n<b>not bold</b>"} className="custom" />
    );
    expect(screen.getByRole("heading", { level: 1, name: "Ada Nowak" })).toBeInTheDocument();
    expect(screen.getByText("Python")).toHaveAttribute("data-slot", "area-badge");
    expect(screen.getByText(/not bold/)).toHaveClass("whitespace-pre-line");
    expect(screen.getByText(/not bold/).textContent).toBe("Line one\n<b>not bold</b>");
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("[data-slot=mentor-profile-header]")).toHaveClass("custom");
    expect(AREA_LABELS).toEqual({ typescript: "TypeScript", react: "React", python: "Python" });
  });

  it("labels a link with hostname plus path", () => {
    expect(linkLabel("https://github.com/ada/ingress-fix?tab=1#readme")).toBe("github.com/ada/ingress-fix");
    expect(linkLabel("https://ada.dev/")).toBe("ada.dev");
    expect(linkLabel("https://ada.dev/notes/")).toBe("ada.dev/notes/");
  });

  it("opens public work in a new tab, says so to screen readers and keeps the order", () => {
    render(<PublicWorkLinks links={["https://github.com/ada/one", "https://ada.dev/"]} className="custom" />);
    expect(screen.getByRole("heading", { level: 2, name: "Public work" })).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "github.com/ada/one(opens in a new tab)",
      "ada.dev(opens in a new tab)",
    ]);
    expect(links[0]).toHaveAttribute("href", "https://github.com/ada/one");
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(links[0]).toHaveAttribute("rel", "nofollow noopener ugc");
    expect(links[0]).toHaveClass("font-mono");
    expect(screen.getByRole("heading", { level: 2 }).closest("section")).toHaveClass("custom");
  });

  it("lists both prices, 25 then 50 minutes", () => {
    render(<PriceList prices={{ 25: "$40", 50: "$1.40" }} className="custom" />);
    const list = screen.getByRole("list", { name: "Prices" });
    expect(list).toHaveClass("custom");
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["25 min · $40", "50 min · $1.40"]);
  });

  it("says sessions are text only and that the mentor is not bookable yet", () => {
    render(<>
      <TextOnlyNote className="custom" />
      <NotBookableNotice className="notice" />
    </>);
    expect(screen.getByText(TEXT_ONLY)).toHaveClass("custom");
    expect(TEXT_ONLY).toBe("Text sessions only");
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(NOT_BOOKABLE);
    expect(NOT_BOOKABLE).toBe("Not taking bookings yet");
    expect(notice).toHaveAttribute("data-variant", "info");
    expect(notice).toHaveClass("notice");
  });
});
