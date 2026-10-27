import { Card, CardContent } from "@devmentor/ui/components/card";
import { Notice } from "@devmentor/ui/frontend/feedback/Notice";

import { Frame } from "./Frame";
import { useSim } from "./sim";
import { registerVariants, useVariant } from "./variants";

// Three layouts of s07 for the review. Same title, same sentence, same one-time notice: only the
// arrangement differs. The chosen letter is review state (the review bar), not product state.

registerVariants("s07", [
  { id: "A", summary: "Plain column: title, notice, sentence (as it was)" },
  { id: "B", summary: "The sentence in a card under the notice" },
  { id: "C", summary: "Two columns from 48rem: title and sentence beside the notice" },
]);

const INTRO = "Text-based mentoring with senior engineers in TypeScript, React and Python.";

export function HomeVariants() {
  const sim = useSim();
  const variant = useVariant("s07");
  const notice = sim.homeNotice ? <Notice variant="success" title={sim.homeNotice} /> : null;

  if (variant === "B") {
    return (
      <Frame title="DevMentor">
        {notice}
        <Card>
          <CardContent>
            <p className="text-body">{INTRO}</p>
          </CardContent>
        </Card>
      </Frame>
    );
  }
  if (variant === "C") {
    return (
      <Frame width="content">
        <div className="grid gap-component md:grid-cols-2">
          <div className="flex flex-col gap-between-groups">
            <h1 className="text-page-title">DevMentor</h1>
            <p className="text-body">{INTRO}</p>
          </div>
          {notice}
        </div>
      </Frame>
    );
  }
  return (
    <Frame title="DevMentor">
      {notice}
      <p className="text-body">{INTRO}</p>
    </Frame>
  );
}
