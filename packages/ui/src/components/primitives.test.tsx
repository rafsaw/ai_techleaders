import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "./alert";
import { Badge, badgeVariants } from "./badge";
import { Button, buttonVariants } from "./button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./empty";
import { Input } from "./input";
import { Label } from "./label";
import { Separator } from "./separator";
import { Spinner } from "./spinner";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "./table";
import { cn } from "../lib/utils";

describe("presentation primitives", () => {
  it("merges conditional classes and resolves Tailwind conflicts", () => {
    expect(cn("px-2", false, undefined, { "font-bold": true }, "px-4")).toBe("font-bold px-4");
  });

  it("composes an alert, forwarding content, classes and accessibility props", () => {
    const { container, rerender } = render(<Alert className="custom" aria-label="Notification">
      <AlertTitle className="custom">Updated</AlertTitle>
      <AlertDescription className="custom">Your changes are saved</AlertDescription>
      <AlertAction className="custom"><button>Dismiss</button></AlertAction>
    </Alert>);
    expect(screen.getByRole("alert", { name: "Notification" })).toHaveClass("bg-card", "custom");
    expect(screen.getByText("Updated")).toHaveAttribute("data-slot", "alert-title");
    expect(screen.getByText("Your changes are saved")).toHaveAttribute("data-slot", "alert-description");
    expect(screen.getByRole("button").parentElement).toHaveAttribute("data-slot", "alert-action");
    expect(container.querySelectorAll(".custom")).toHaveLength(4);
    rerender(<Alert variant="destructive">Failed</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("text-destructive");
  });

  it("composes a card and supports compact size", () => {
    const { container, rerender } = render(<Card className="custom">
      <CardHeader className="custom"><CardTitle className="custom">Title</CardTitle>
        <CardDescription className="custom">Description</CardDescription><CardAction className="custom">Action</CardAction>
      </CardHeader><CardContent className="custom">Content</CardContent><CardFooter className="custom">Footer</CardFooter>
    </Card>);
    expect(container.querySelector('[data-slot="card"]')).toHaveAttribute("data-size", "default");
    for (const slot of ["card", "card-header", "card-title", "card-description", "card-action", "card-content", "card-footer"]) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).toHaveClass("custom");
    }
    rerender(<Card size="sm">Small</Card>);
    expect(screen.getByText("Small")).toHaveAttribute("data-size", "sm");
  });

  it("renders empty state primitives and both media variants", () => {
    const { container, rerender } = render(<Empty className="custom"><EmptyHeader className="custom">
      <EmptyMedia className="custom">Media</EmptyMedia><EmptyTitle className="custom">Nothing</EmptyTitle>
      <EmptyDescription className="custom">Try again</EmptyDescription>
    </EmptyHeader><EmptyContent className="custom">Action</EmptyContent></Empty>);
    expect(screen.getByText("Media")).toHaveAttribute("data-variant", "default");
    for (const slot of ["empty", "empty-header", "empty-icon", "empty-title", "empty-description", "empty-content"]) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).toHaveClass("custom");
    }
    rerender(<EmptyMedia variant="icon">Icon</EmptyMedia>);
    expect(screen.getByText("Icon")).toHaveAttribute("data-variant", "icon");
    expect(screen.getByText("Icon")).toHaveClass("bg-muted");
  });

  it("supports default badges and polymorphic links", () => {
    const { rerender } = render(<Badge className="custom">Active</Badge>);
    expect(screen.getByText("Active")).toHaveAttribute("data-slot", "badge");
    expect(screen.getByText("Active")).toHaveClass("custom", "bg-primary");
    rerender(<Badge variant="outline" render={<a href="/profile" />}>Profile</Badge>);
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link")).toHaveAttribute("data-variant", "outline");
    for (const variant of ["default", "secondary", "destructive", "outline", "ghost", "link"] as const) {
      expect(badgeVariants({ variant })).toBeTruthy();
    }
  });

  it("forwards button events, disabled state and link rendering", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button className="custom" onClick={onClick}>Save</Button>);
    expect(screen.getByRole("button")).toHaveClass("custom", "bg-primary");
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
    rerender(<Button variant="outline" size="sm" disabled onClick={onClick}>Save</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
    rerender(<Button nativeButton={false} render={<a href="/users" />}>Users</Button>);
    expect(screen.getByRole("button", { name: "Users" })).toHaveAttribute("href", "/users");
    for (const variant of ["default", "secondary", "destructive", "outline", "ghost", "link"] as const) {
      expect(buttonVariants({ variant })).toBeTruthy();
    }
    for (const size of ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"] as const) {
      expect(buttonVariants({ size })).toBeTruthy();
    }
  });

  it("connects labels and inputs and forwards input properties and changes", () => {
    const onChange = vi.fn();
    render(<><Label className="custom" htmlFor="email">Email</Label>
      <Input className="custom" id="email" type="email" placeholder="you@example.com" onChange={onChange} />
    </>);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("placeholder", "you@example.com");
    expect(input).toHaveClass("custom");
    expect(screen.getByText("Email")).toHaveClass("custom");
    fireEvent.change(input, { target: { value: "you@example.com" } });
    expect(onChange).toHaveBeenCalledOnce();
    expect(input).toHaveValue("you@example.com");
  });

  it("supports separator orientations and announces a spinner", () => {
    const { rerender } = render(<><Separator className="custom" /><Spinner className="custom" /></>);
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "horizontal");
    expect(screen.getByRole("separator")).toHaveClass("custom");
    expect(screen.getByRole("status", { name: "Loading" })).toHaveClass("animate-spin", "custom");
    rerender(<Separator orientation="vertical" />);
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
  });

  it("composes a semantic table with caption and footer", () => {
    const { container } = render(<Table className="custom"><TableCaption className="custom">Users</TableCaption>
      <TableHeader className="custom"><TableRow className="custom"><TableHead className="custom">Name</TableHead></TableRow></TableHeader>
      <TableBody className="custom"><TableRow className="custom"><TableCell className="custom">Ada</TableCell></TableRow></TableBody>
      <TableFooter className="custom"><TableRow className="custom"><TableCell className="custom">One user</TableCell></TableRow></TableFooter>
    </Table>);
    expect(screen.getByRole("table", { name: "Users" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "Ada" })).toBeVisible();
    for (const slot of ["table", "table-caption", "table-header", "table-row", "table-head", "table-body", "table-cell", "table-footer"]) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).toHaveClass("custom");
    }
  });
});
