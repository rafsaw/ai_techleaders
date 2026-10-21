import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import { Button } from "@devmentor/ui/components/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@devmentor/ui/components/table";

import { StateTable } from "../../.storybook/blocks/stories";

// Fictional accounts for the /backend users table (the existing reference example).
const users = [
  { id: "1", name: "Ada Nowak", email: "ada.nowak@example.com", created: "2026-10-14" },
  { id: "2", name: "Marek Zieliński", email: "marek.zielinski@example.com", created: "2026-10-16" },
  { id: "3", name: "Priya Raman", email: "priya.raman@example.com", created: "2026-10-19" },
];

function UsersTable({ caption = "Users" }: { caption?: string }) {
  return (
    <Table>
      <TableCaption>{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell className="tabular-nums">{user.created}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const meta = {
  title: "Primitives/Signed-in/Table",
  component: Table,
  tags: ["!autodocs"],
  render: () => <UsersTable />,
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The /backend users table. The caption names the table for screen readers. */
export const Playground: Story = {
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table", { name: "Users" });
    await expect(table).toBeVisible();
    await expect(canvas.getAllByRole("columnheader")).toHaveLength(3);
    await expect(canvas.getAllByRole("row")).toHaveLength(4);
  },
};

/** Every part: caption, header, body rows, footer with a total, and a row action. */
export const Anatomy: Story = {
  render: () => (
    <Table>
      <TableCaption>Users</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" aria-label={`Edit ${user.name}`}>Edit</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3} className="tabular-nums">3 users</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};

/** Row states. Hover is a frozen preview; selected uses data-state="selected". */
export const States: Story = {
  render: () => (
    <StateTable
      rows={[
        {
          state: "Rows: default, hover, selected",
          note: "hover frozen",
          children: (
            <Table>
              <TableCaption>Row states</TableCaption>
              <TableBody>
                <TableRow><TableCell>Ada Nowak</TableCell><TableCell>default</TableCell></TableRow>
                <TableRow data-preview-state="hover"><TableCell>Marek Zieliński</TableCell><TableCell>hover</TableCell></TableRow>
                <TableRow data-state="selected"><TableCell>Priya Raman</TableCell><TableCell>selected</TableCell></TableRow>
              </TableBody>
            </Table>
          ),
        },
      ]}
    />
  ),
};

/**
 * At 320 px the table keeps its columns and scrolls sideways inside its own container;
 * the page itself never scrolls. The container is focusable so keyboard users can scroll it.
 */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  render: () => <UsersTable caption="Users (scrolls sideways)" />,
  play: async ({ canvasElement }) => {
    const container = canvasElement.querySelector<HTMLElement>('[data-slot="table-container"]')!;
    await expect(container.scrollWidth).toBeGreaterThan(container.clientWidth);
    await userEvent.tab();
    await expect(container).toHaveFocus();
    await expect(getComputedStyle(container).outlineStyle).toBe("solid");
  },
};
