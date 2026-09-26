"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Pagination from "./Pagination";
import FormModal, { type FormTable } from "./FormModal";
import { EyeIcon, SearchIcon, SortAscIcon, SortDescIcon } from "./Icons";
import { apiFetch, type PaginationMeta } from "@/lib/api";

const PAGE_SIZE = 20;

// Loads every record of a list endpoint (100 per request, the backend max) so
// search and sort cover the whole list; ListPage paginates on the client.
export function useResourceList<R>(path: string) {
  const [records, setRecords] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    const separator = path.includes("?") ? "&" : "?";
    (async () => {
      const all: R[] = [];
      for (let page = 1; ; page++) {
        const response = await apiFetch<{ data: R[]; meta?: PaginationMeta }>(`${path}${separator}pageSize=100&page=${page}`);
        all.push(...(response.data ?? []));
        if (!response.meta || page >= response.meta.totalPages) break;
      }
      return all;
    })()
      .then((all) => {
        if (cancelled) return;
        setRecords(all);
        setError("");
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Unable to load data"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [path]);

  useEffect(() => reload(), [reload]);

  return { records, loading, error, reload: () => void reload() };
}

export type Column = { header: string; className?: string };

type ListPageProps<T> = {
  title: string;
  subtitle?: string;
  columns: Column[];
  rows: T[];
  rowKey: (row: T) => string;
  renderCells: (row: T) => ReactNode;
  // Text matched by the search box, and the value rows are sorted by.
  searchText: (row: T) => string;
  sortValue: (row: T) => string | number;
  sortLabel?: string;
  loading: boolean;
  error?: string;
  createTable?: FormTable;
  canCreate?: boolean;
  onChanged: () => void;
};

export default function ListPage<T>({
  title, subtitle, columns, rows, rowKey, renderCells, searchText, sortValue, sortLabel = "name",
  loading, error, createTable, canCreate, onChanged,
}: ListPageProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? rows.filter((row) => searchText(row).toLowerCase().includes(q)) : rows;
    return [...filtered].sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, query, sortDir, searchText, sortValue]);

  const totalPages = Math.max(Math.ceil(visible.length / PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const SortIcon = sortDir === "asc" ? SortAscIcon : SortDescIcon;

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl m-4 mt-0 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-lamaSky">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-3 flex-1 md:flex-none focus-within:ring-lamaPurple">
            <SearchIcon className="w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Search..."
              aria-label={`Search ${title}`}
              className="w-full md:w-[200px] p-2 bg-transparent outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))}
            title={`Sort by ${sortLabel} (${sortDir === "asc" ? "ascending" : "descending"})`}
            aria-label={`Sort by ${sortLabel}, currently ${sortDir === "asc" ? "ascending" : "descending"}`}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-lamaYellow text-lamaSky hover:brightness-95 shrink-0"
          >
            <SortIcon className="w-5 h-5" />
          </button>
          {canCreate && createTable && <FormModal table={createTable} type="create" onSuccess={onChanged} />}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-md p-3 mb-2" role="alert">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full mt-2">
          <thead>
            <tr className="text-left text-gray-500 text-sm border-b border-gray-200">
              {columns.map((column) => (
                <th key={column.header} className={`p-3 font-medium ${column.className ?? ""}`}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-gray-100 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight">
                {renderCells(row)}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && visible.length === 0 && !error && (
          <p className="text-center text-sm text-gray-500 py-10">
            {query ? `No results for "${query}".` : "No records yet."}
          </p>
        )}
        {loading && rows.length === 0 && <p className="text-center text-sm text-gray-400 py-10">Loading…</p>}
      </div>

      <div className="mt-4">
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}

// ── Small shared cell helpers ──────────────────────────────────────────────

export const Cell = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <td className={`p-3 ${className}`}>{children}</td>
);

export const Chips = ({ items, max = 3 }: { items: string[]; max?: number }) =>
  items.length === 0 ? (
    <span className="text-gray-400">-</span>
  ) : (
    <div className="flex flex-wrap gap-1">
      {items.slice(0, max).map((item) => (
        <span key={item} className="bg-lamaSkyLight text-lamaSky text-xs px-2 py-0.5 rounded-full">{item}</span>
      ))}
      {items.length > max && <span className="bg-lamaSkyLight text-lamaSky text-xs px-2 py-0.5 rounded-full">+{items.length - max}</span>}
    </div>
  );

export const ViewLink = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    title={label}
    aria-label={label}
    className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaSkyLight text-lamaSky border border-gray-200 hover:bg-lamaPurple hover:text-white transition-colors shrink-0"
  >
    <EyeIcon />
  </Link>
);

export const Actions = ({ children }: { children: ReactNode }) => (
  <td className="p-3"><div className="flex items-center gap-2">{children}</div></td>
);
