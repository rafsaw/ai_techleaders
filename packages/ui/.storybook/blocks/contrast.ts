// Documentation helper only (not exported from the package): reads the tokens the browser
// actually loaded and measures WCAG contrast, so the tables on Foundations/Color never drift.

export type Theme = "light" | "dark";
type Rgb = [number, number, number];

const THEME_SELECTOR: Record<Theme, string> = { light: ":root", dark: ".dark" };

/** Collects the custom-property declarations of one theme selector from the loaded stylesheets. */
function themeDeclarations(theme: Theme): Map<string, string> {
  const declarations = new Map<string, string>();
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule && rule.selectorText === THEME_SELECTOR[theme]) {
        for (const name of Array.from(rule.style)) {
          if (name.startsWith("--")) declarations.set(name, rule.style.getPropertyValue(name).trim());
        }
      } else if ("cssRules" in rule && !(rule instanceof CSSMediaRule)) {
        visit((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      visit(sheet.cssRules);
    } catch {
      // Cross-origin sheets (none expected) cannot be read.
    }
  }
  return declarations;
}

/** Resolves a token for a theme down to its final value, following var() through both layers. */
export function resolveToken(name: string, theme: Theme): string {
  const light = themeDeclarations("light");
  const own = theme === "dark" ? themeDeclarations("dark") : light;
  const resolve = (value: string, depth = 0): string =>
    depth > 10
      ? value
      : value.replace(/var\((--[\w-]+)\)/g, (_, ref: string) => resolve(own.get(ref) ?? light.get(ref) ?? "", depth + 1));
  return resolve(own.get(name) ?? light.get(name) ?? "");
}

/** Parses an oklch colour string (L C H, optional alpha) into linear sRGB plus alpha. */
export function parseOklch(value: string): { rgb: Rgb; alpha: number } | null {
  const match = /oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/.exec(value);
  if (!match) return null;
  const num = (s: string) => (s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s));
  const [L, C, H] = [num(match[1]!), num(match[2]!), num(match[3]!)];
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  return {
    rgb: [
      clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    ],
    alpha: match[4] ? num(match[4]) : 1,
  };
}

const encode = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const decode = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Composites a colour with alpha over a background in gamma-encoded sRGB, as browsers do. */
export function over(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  return fg.map((c, i) => decode(encode(c) * alpha + encode(bg[i]!) * (1 - alpha))) as Rgb;
}

/** WCAG 2.x contrast ratio of two linear sRGB colours. */
export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Measures a token pair in a theme. `tint` paints the foreground at that alpha over `surface` first. */
export function measure(fg: string, bg: string, theme: Theme, tint?: number): number | null {
  const f = parseOklch(resolveToken(fg, theme));
  const b = parseOklch(resolveToken(bg, theme));
  if (!f || !b) return null;
  const background = tint === undefined ? b.rgb : over(f.rgb, tint, b.rgb);
  return contrast(f.alpha < 1 ? over(f.rgb, f.alpha, b.rgb) : f.rgb, background);
}
