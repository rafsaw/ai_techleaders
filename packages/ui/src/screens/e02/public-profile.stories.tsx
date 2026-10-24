import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { LinkButton } from "@devmentor/ui/frontend/actions/LinkButton";

import { ADA_PROFILE, PublicProfile, type Profile } from "../../../.storybook/blocks/public-profile";
import { ADA, Screen, screenParameters } from "../../../.storybook/blocks/screen";

interface Args {
  profile: Profile;
  signedIn: boolean;
}

/** /mentors/[id] (E02 Flow 2 step 4, public): the Detail view pattern under the site header. */
function PublicProfileScreen({ profile, signedIn }: Args) {
  return (
    <Screen account={signedIn ? ADA : null}>
      <PublicProfile profile={profile} />
    </Screen>
  );
}

const meta = {
  title: "Screens/E02/Public profile",
  tags: ["!autodocs"],
  parameters: screenParameters,
  args: { profile: { ...ADA_PROFILE, displayName: "Marta Kowalczyk", area: "python", description: "Django, Celery and the deploy that worked yesterday.\nI answer in code you can paste." }, signedIn: false },
  render: (args: Args) => <PublicProfileScreen {...args} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

const aboveTheFold = (element: Element) => element.getBoundingClientRect().bottom <= window.innerHeight;

/** Bookable, signed out: who, what, prices and public work; no ratings. */
export const Bookable: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(aboveTheFold(canvas.getByRole("list", { name: "Prices" }))).toBe(true);
    await expect(canvasElement.textContent).not.toMatch(/★|rating|review/i);
  },
};

/** Not taking bookings yet (MD4). */
export const NotBookable: Story = { args: { profile: { ...ADA_PROFILE, bookable: false } } };

/** Signed in as a mentee: the header changes, the page does not. */
export const SignedIn: Story = { args: { signedIn: true } };

/** Five links. */
export const ManyLinks: Story = {
  args: {
    profile: {
      ...ADA_PROFILE,
      publicWorkLinks: [
        "https://github.com/adanowak/strict-migration",
        "https://github.com/react-hook-form/react-hook-form/pull/11342",
        "https://ada.dev/notes/typescript-generics-in-forms",
        "https://stackoverflow.com/users/4417120/ada-nowak",
        "https://www.npmjs.com/package/@adanowak/zod-form-errors",
      ],
    },
  },
};

/** Not found or no access: one 404 (P-DV3). */
export const NotFound: Story = {
  render: () => (
    <Screen account={null} title="Page not found" width="text">
      <p className="text-body">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <LinkButton href="/" className="self-start">Go to the home page</LinkButton>
    </Screen>
  ),
};

/** 320 px, not bookable, long name. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  args: { profile: { ...ADA_PROFILE, bookable: false, displayName: "Aleksandra Wiśniewska-Konstantynowicz" } },
  play: async ({ canvas, canvasElement }) => {
    await expect(aboveTheFold(canvas.getByRole("status"))).toBe(true);
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
