"use client";

import { useState, type ReactNode } from "react";

import { EmptyState, type EmptyStateProps } from "@devmentor/ui/backend/feedback/EmptyState";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/ErrorMessage";
import { LoadingMessage } from "@devmentor/ui/backend/feedback/LoadingMessage";
import { Button } from "@devmentor/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@devmentor/ui/components/table";

const DEFAULT_PAGE_SIZE = 10;

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: readonly DataTableColumn<T>[];
  /** `undefined` while the first load is in flight. */
  rows: readonly T[] | undefined;
  getRowId: (row: T) => string;
  isLoading?: boolean;
  /** When set, replaces the table with an error message. */
  error?: string | null;
  onRetry?: () => void;
  emptyState?: EmptyStateProps;
  /** Rendered in a trailing column, e.g. edit/delete buttons. */
  rowActions?: (row: T) => ReactNode;
  pageSize?: number;
}

/** Column-config-driven list with built-in loading, error, empty and pagination states. */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading = false,
  error,
  onRetry,
  emptyState = { title: "Nothing here yet" },
  rowActions,
  pageSize = DEFAULT_PAGE_SIZE,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);

  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;
  if (isLoading || !rows) return <LoadingMessage />;
  if (rows.length === 0) return <EmptyState {...emptyState} />;

  const pageCount = Math.ceil(rows.length / pageSize);
  // Clamp rather than reset in an effect, so a shrinking list never shows an empty page.
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  return (
    <div className="flex flex-col gap-in-group">
      {/* overflow-hidden keeps row hover inside the rounded panel but would clip the table's own
          focus outline, so the panel draws it while the scroll container has keyboard focus. */}
      <div className="overflow-hidden rounded-panel border border-border bg-card has-[[data-slot=table-container]:focus-visible]:outline-2 has-[[data-slot=table-container]:focus-visible]:outline-offset-2 has-[[data-slot=table-container]:focus-visible]:outline-ring has-[[data-slot=table-container]:focus-visible]:outline-solid">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.id} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
              {rowActions && (
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={getRowId(row)}>
                {columns.map((column) => (
                  <TableCell key={column.id} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
                {rowActions && <TableCell className="text-right">{rowActions(row)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-in-group text-meta text-muted-foreground tabular-nums">
          <span>
            Page {currentPage + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === pageCount - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
