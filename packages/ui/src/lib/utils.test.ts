import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("keeps a type role next to a text colour", () => {
    expect(cn("text-label text-primary-foreground")).toBe("text-label text-primary-foreground");
    expect(cn("text-control md:text-body text-foreground")).toBe("text-control md:text-body text-foreground");
  });

  it("lets the later token win within one group", () => {
    expect(cn("text-body", "text-label")).toBe("text-label");
    expect(cn("h-button-md", "h-button-lg")).toBe("h-button-lg");
    expect(cn("px-control-x", "px-button-x-lg")).toBe("px-button-x-lg");
    expect(cn("rounded-button", "rounded-control")).toBe("rounded-control");
    expect(cn("gap-in-group", "gap-between-groups")).toBe("gap-between-groups");
    expect(cn("p-panel", "p-panel-compact")).toBe("p-panel-compact");
    expect(cn("max-w-content", "max-w-text")).toBe("max-w-text");
    expect(cn("shadow-sm", "shadow-overlay")).toBe("shadow-overlay");
    expect(cn("duration-control", "duration-menu")).toBe("duration-menu");
  });
});

describe("cn with named grid layouts", () => {
  it("treats grid-cols-icon-text and grid-cols-text-action as one group", () => {
    expect(cn("grid-cols-2", "grid-cols-icon-text")).toBe("grid-cols-icon-text");
    expect(cn("grid-cols-icon-text", "grid-cols-text-action")).toBe("grid-cols-text-action");
    expect(cn("h-badge", "h-6")).toBe("h-6");
    expect(cn("px-badge-x", "px-2")).toBe("px-2");
  });
});
