import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

function RemoveSlot({ size, onRemove }: { size?: "default" | "sm"; onRemove?: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Remove</AlertDialogTrigger>
      <AlertDialogContent size={size} className="custom">
        <AlertDialogHeader className="custom">
          <AlertDialogMedia className="custom">!</AlertDialogMedia>
          <AlertDialogTitle className="custom">Remove the slot on Wed, 4 Nov, 18:30?</AlertDialogTitle>
          <AlertDialogDescription className="custom">Mentees will no longer see this time.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="custom">
          <AlertDialogCancel className="custom">Cancel</AlertDialogCancel>
          <AlertDialogAction className="custom" variant="destructive" onClick={onRemove}>Remove slot</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog", () => {
  it("opens from its trigger with a named, described alertdialog and all its parts", async () => {
    const onRemove = vi.fn();
    render(<RemoveSlot onRemove={onRemove} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Remove the slot on Wed, 4 Nov, 18:30?" });
    expect(dialog).toHaveAccessibleDescription("Mentees will no longer see this time.");
    expect(dialog).toHaveAttribute("data-size", "default");
    expect(dialog).toHaveClass("custom", "shadow-overlay", "rounded-panel");
    expect(document.querySelector('[data-slot="alert-dialog-overlay"]')).toHaveClass("bg-scrim");
    for (const slot of ["alert-dialog-header", "alert-dialog-media", "alert-dialog-title", "alert-dialog-description", "alert-dialog-footer", "alert-dialog-cancel", "alert-dialog-action"]) {
      expect(document.querySelector(`[data-slot="${slot}"]`)).toHaveClass("custom");
    }
    fireEvent.click(screen.getByRole("button", { name: "Remove slot" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("closes with Cancel and supports the small size", async () => {
    render(<RemoveSlot size="sm" />);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveAttribute("data-size", "sm");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass("border-input");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await vi.waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });
});
