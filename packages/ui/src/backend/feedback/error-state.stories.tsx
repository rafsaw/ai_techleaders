import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";

import { ErrorMessage } from "@devmentor/ui/backend/feedback/ErrorMessage";

import { Sample, StateTable } from "../../../.storybook/blocks/stories";

// The real messages of the shared API layer: apiCall (no network) and apiHandler (500).
const NETWORK = "Could not reach the server. Check your connection and try again.";

const meta = {
  title: "Primitives/Signed-in/Error state",
  component: ErrorMessage,
  tags: ["!autodocs"],
  args: { title: "Could not load users", message: NETWORK, onRetry: fn() },
  render: (args) => (
    <div className="max-w-text">
      <ErrorMessage {...args} />
    </div>
  ),
} satisfies Meta<typeof ErrorMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Change the text in the Controls panel. The error is read at once (role="alert") and Retry
 * calls the caller's onRetry.
 */
export const Playground: Story = {
  play: async ({ args, canvas }) => {
    const alert = canvas.getByRole("alert");
    await expect(alert).toHaveTextContent("Could not load users");
    await expect(alert).toHaveTextContent(NETWORK);
    await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};

/** With Retry when loading again can help; without it when it cannot (the caller decides). */
export const Variants: Story = {
  render: () => (
    <div className="flex max-w-text flex-col gap-between-groups">
      <Sample label="load error with retry · with a title that names what failed">
        <ErrorMessage title="Could not load users" message={NETWORK} onRetry={() => {}} />
      </Sample>
      <Sample label="default title · DataTable passes none (P-E4)">
        <ErrorMessage message={NETWORK} onRetry={() => {}} />
      </Sample>
      <Sample label="form error without retry · CrudForm, the form keeps its values">
        <ErrorMessage title="Could not save" message={NETWORK} />
      </Sample>
    </div>
  ),
};

/**
 * One state: shown. It is not interactive itself; Retry has the states of a small outline
 * Button (see Button, States).
 */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        { state: "Error", children: <ErrorMessage title="Could not load users" message={NETWORK} onRetry={() => {}} /> },
      ]}
    />
  ),
};

/** At 320 px the message wraps; Retry stays in the top-right corner and reachable by Tab. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  play: async ({ args, canvas, canvasElement }) => {
    await userEvent.tab();
    const retry = canvas.getByRole("button", { name: "Retry" });
    await expect(retry).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onRetry).toHaveBeenCalled();
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
