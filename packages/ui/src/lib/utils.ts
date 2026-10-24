import { createCn } from "cn/config"

// The token utilities from globals.css (type roles, relation spacing, role radii, …) are
// unknown to the default merge tables: without this, cn("text-label text-primary-foreground")
// drops the type role as if it were a second text colour.
export const cn = createCn({
  extend: {
    theme: {
      text: ["page-title", "section-title", "row-title", "body", "label", "control", "meta"],
      spacing: [
        "in-group",
        "between-groups",
        "panel",
        "panel-compact",
        "component",
        "section",
        "list-row-y",
        "list-row-gap",
        "page-gutter",
        "button-lg",
        "button-md",
        "button-sm",
        "button-xs",
        "control-md",
        "control-sm",
        "control-x",
        "button-x-lg",
        "button-x-md",
        "button-x-sm",
        "button-x-xs",
        "badge",
        "badge-x",
      ],
      radius: ["control", "button", "panel", "pill"],
      shadow: ["overlay"],
      container: ["content", "text"],
    },
    classGroups: {
      duration: [{ duration: ["control", "menu", "dialog"] }],
      "grid-cols": [{ "grid-cols": ["icon-text", "text-action"] }],
    },
  },
})
