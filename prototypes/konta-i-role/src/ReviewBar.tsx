import { useEffect, useState } from "react";

import { Badge } from "@devmentor/ui/components/badge";
import { NativeSelect, NativeSelectOption } from "@devmentor/ui/components/native-select";

import { DAY, GITHUB_IDENTITIES, HOUR, IDENTITY_LABELS } from "./data";
import { SCREENS } from "./routes";
import {
  chooseGithubIdentity, clearInbox, navigate, reset, setClockOffset, setScenario, switchAccount, useSim, type Scenario,
} from "./sim";

// The review bar: everything that belongs to the prototype and not to the product. The product
// navigation lives in the screens' own SiteHeader. The engine adds its own controls to this bar
// (Clickable / Comment, hotspots, Presentation, Threads, pins), before the theme toggle.

const THEME_KEY = "konta-i-role-theme";

function initialDark(): boolean {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === "dark";
  } catch {
    // Storage can be blocked; the theme then simply follows the system.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

interface Option {
  value: string;
  label: string;
}

/** One scenario control: a label with its map id, and a native select (no dead clicks, no hidden state). */
function Control({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: Option[]; onChange: (value: string) => void }) {
  return (
    <label className="scenario-field">
      <span className="text-label">
        {label} <span className="text-meta text-muted-foreground">({id})</span>
      </span>
      <NativeSelect value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </label>
  );
}

/** A select that opens something on choice and then goes back to its prompt. */
function OpenControl({ id, label, options }: { id: string; label: string; options: { href: string; label: string }[] }) {
  return (
    <Control
      id={id}
      label={label}
      value=""
      options={[{ value: "", label: "Open…" }, ...options.map((option) => ({ value: option.href, label: option.label }))]}
      onChange={(href) => href && navigate(href)}
    />
  );
}

const CLOCK: Option[] = [
  { value: "0", label: "Fixed now: Mon 2 Nov 2026, 10:00 UTC" },
  { value: String(25 * HOUR), label: "+25 hours (confirmation links expire)" },
  { value: String(15 * DAY), label: "+15 days (invitations expire)" },
  { value: String(31 * DAY), label: "+31 days (sessions expire)" },
];

export function ReviewBar() {
  const sim = useSim();
  const { scenario } = sim;
  const [dark, setDark] = useState(initialDark);

  // The menus are native <details>: close them when the person picks a screen or clicks elsewhere.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element;
      document.querySelectorAll<HTMLDetailsElement>(".doc-toolbar details[open]").forEach((menu) => {
        if (!menu.contains(target) || target.closest(".screen-nav a")) menu.open = false;
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {
      // Not persisting the theme is fine.
    }
  }, [dark]);

  return (
    <header className="doc-toolbar">
      <Badge variant="outline">Prototype</Badge>
      <span className="doc-title">Epic 01 · Accounts and access</span>
      <details className="bar-menu">
        <summary className="btn btn-outline btn-sm">Screens</summary>
        <nav className="screen-nav bar-panel" aria-label="Screens">
          {SCREENS.map((screen) => (
            <a key={screen.id} href={`#${screen.id}`}>
              {screen.id} · {screen.title}
            </a>
          ))}
        </nav>
      </details>
      <a className="btn btn-outline btn-sm" href="#s13">
        Demo inbox ({sim.mails.length})
      </a>
      <details className="bar-menu">
        <summary className="btn btn-outline btn-sm">Scenarios</summary>
        <div className="bar-panel scenario-panel">
          <fieldset className="scenario-group">
            <legend className="text-section-title">Who is signed in</legend>
            <Control
              id="demo account"
              label="Signed in as"
              value={sim.sessionUserId ?? ""}
              options={[
                { value: "", label: "Signed out" },
                ...sim.accounts.map((account) => ({ value: account.id, label: `${account.displayName} (${account.roles.join(" + ")})` })),
              ]}
              onChange={(id) => switchAccount(id || null)}
            />
            <Control
              id="c09"
              label="Session"
              value={scenario.sessionExpired ? "expired" : "active"}
              options={[{ value: "active", label: "Active" }, { value: "expired", label: "Expired in the database (cookie still there)" }]}
              onChange={(value) => setScenario({ sessionExpired: value === "expired" })}
            />
            <Control
              id="c13"
              label="Demo clock"
              value={String(sim.clockOffset)}
              options={CLOCK}
              onChange={(value) => setClockOffset(Number(value))}
            />
            <p className="text-meta text-muted-foreground">
              Live role changes (c10) are documented in the map (s08) and not simulated.
            </p>
          </fieldset>

          <fieldset className="scenario-group">
            <legend className="text-section-title">GitHub</legend>
            <Control
              id="c01"
              label="GitHub result"
              value={scenario.github}
              options={[
                { value: "authorize", label: "Authorizes" },
                { value: "denied", label: "Cancelled or denied" },
                { value: "unavailable", label: "GitHub unavailable" },
                { value: "state_expired", label: "OAuth state expired (> 10 min)" },
                { value: "no_email", label: "Identity without a verified email" },
                { value: "email_taken", label: "Email linked to another GitHub account" },
              ]}
              onChange={(value) => setScenario({ github: value as Scenario["github"] })}
            />
            <Control
              id="c02"
              label="GitHub identity"
              value={sim.githubIdentityKey}
              options={GITHUB_IDENTITIES.map((identity) => ({ value: identity.key, label: IDENTITY_LABELS[identity.key]! }))}
              onChange={chooseGithubIdentity}
            />
          </fieldset>

          <fieldset className="scenario-group">
            <legend className="text-section-title">Email</legend>
            <Control
              id="c03"
              label="Sending email"
              value={scenario.mail}
              options={[
                { value: "ok", label: "Works" },
                { value: "smtp_down", label: "SMTP is down" },
                { value: "limit", label: "Address limit (3 per hour) used up" },
              ]}
              onChange={(value) => setScenario({ mail: value as Scenario["mail"] })}
            />
            <Control
              id="c04"
              label="Address typed at sign-up"
              value={scenario.signUpEmail}
              options={[
                { value: "new", label: "New address (empty field)" },
                { value: "unconfirmed", label: "Unconfirmed account (Ewa)" },
                { value: "confirmed", label: "Confirmed account (Tomek)" },
              ]}
              onChange={(value) => setScenario({ signUpEmail: value as Scenario["signUpEmail"] })}
            />
            <OpenControl
              id="c06"
              label="Confirmation link"
              options={[
                { href: "/confirm-email?token=ewa-valid", label: "Valid" },
                { href: "/confirm-email?token=ewa-expired", label: "Expired" },
                { href: "/confirm-email?token=tomek-used", label: "Already used" },
                { href: "/confirm-email?token=ewa-replaced", label: "Replaced by a newer one" },
                { href: "/confirm-email?token=ewa-takeover", label: "After GitHub claimed the account" },
              ]}
            />
          </fieldset>

          <fieldset className="scenario-group">
            <legend className="text-section-title">Invitations</legend>
            <OpenControl
              id="c07"
              label="Invitation link"
              options={[
                { href: "/invite/demo-bartek", label: "Valid (Bartek)" },
                { href: "/invite/demo-wygasle", label: "Expired" },
                { href: "/invite/demo-odwolane", label: "Revoked" },
                { href: "/invite/demo-uzyte", label: "Already used" },
                { href: "/invite/demo-zly-token", label: "Forged" },
              ]}
            />
            <Control
              id="c08"
              label="Accepting, next request"
              value={scenario.accept}
              options={[
                { value: "ok", label: "Works" },
                { value: "race", label: "Lost a race (404)" },
                { value: "already_mentor", label: "Already a mentor (409)" },
                { value: "other_address", label: "Forced other address (403)" },
              ]}
              onChange={(value) => setScenario({ accept: value as Scenario["accept"] })}
            />
            <Control
              id="c14"
              label="Return after sign-in"
              value={scenario.returnToInvite ? "invite" : "none"}
              options={[{ value: "none", label: "None" }, { value: "invite", label: "The invitation (Bartek)" }]}
              onChange={(value) => setScenario({ returnToInvite: value === "invite" })}
            />
          </fieldset>

          <fieldset className="scenario-group">
            <legend className="text-section-title">Account, network and limits</legend>
            <Control
              id="c11"
              label="Saving the name, next request"
              value={scenario.nameSaveError ? "error" : "ok"}
              options={[{ value: "ok", label: "Works" }, { value: "error", label: "Field error" }]}
              onChange={(value) => setScenario({ nameSaveError: value === "error" })}
            />
            <Control
              id="c12"
              label="Network and server"
              value={scenario.network}
              options={[
                { value: "ok", label: "Works" },
                { value: "offline", label: "No network" },
                { value: "database_down", label: "Database unavailable (opens s12)" },
              ]}
              onChange={(value) => setScenario({ network: value as Scenario["network"] })}
            />
            <Control
              id="c05"
              label="Too many attempts (429) on sign-in"
              value={scenario.rateLimited ? "on" : "off"}
              options={[{ value: "off", label: "Off" }, { value: "on", label: "On" }]}
              onChange={(value) => setScenario({ rateLimited: value === "on" })}
            />
          </fieldset>

          <fieldset className="scenario-group">
            <legend className="text-section-title">Open /backend (c16)</legend>
            <div className="scenario-buttons">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { switchAccount("a1"); navigate("/backend"); }}>
                As a mentee
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { switchAccount(null); navigate("/backend"); }}>
                Signed out
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { switchAccount("a5"); navigate("/backend"); }}>
                As an operator
              </button>
            </div>
          </fieldset>

          <fieldset className="scenario-group">
            <legend className="text-section-title">Reset (c15)</legend>
            <div className="scenario-buttons">
              <button type="button" className="btn btn-outline btn-sm" onClick={reset}>
                Reset demo
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={clearInbox}>
                Clear inbox
              </button>
            </div>
          </fieldset>
        </div>
      </details>
      <button id="theme-toggle" type="button" className="btn btn-outline btn-sm" aria-pressed={dark} onClick={() => setDark(!dark)}>
        {dark ? "Light theme" : "Dark theme"}
      </button>
    </header>
  );
}
