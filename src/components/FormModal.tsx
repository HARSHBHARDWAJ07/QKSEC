"use client";

import { useEffect, useState } from "react";
import EntityForm from "./forms/EntityForm";
import { apiFetch, ApiError } from "@/lib/api";
import { endpointByTable } from "@/lib/entityEndpoints";
import { invalidateLookups } from "@/lib/lookups";
import { CloseIcon, PencilIcon, PlusIcon, TrashIcon } from "./Icons";

export type FormTable =
  | "teacher" | "student" | "parent" | "subject" | "class" | "exam"
  | "assignment" | "result" | "lesson" | "event" | "announcement" | "attendance";

type FormModalProps = {
  table: FormTable;
  type: "create" | "update" | "delete";
  // For updates: the raw API record to edit.
  data?: Record<string, unknown>;
  id?: number | string;
  onSuccess?: () => void;
};

const buttonStyle = {
  create: "w-9 h-9 bg-lamaYellow text-lamaSky hover:brightness-95",
  update: "w-8 h-8 bg-lamaSkyLight text-lamaSky border border-gray-200 hover:bg-lamaPurple hover:text-white",
  delete: "w-8 h-8 bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white",
};

const FormModal = ({ table, type, data, id, onSuccess }: FormModalProps) => {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleSuccess() {
    setOpen(false);
    onSuccess?.();
  }

  async function handleDelete() {
    setDeleteError("");
    setDeleting(true);
    try {
      const endpoint = endpointByTable[table];
      if (!endpoint || id === undefined) throw new Error("This record can't be deleted.");
      await apiFetch(`/${endpoint}/${id}`, undefined, { method: "DELETE" });
      invalidateLookups();
      handleSuccess();
    } catch (error) {
      setDeleteError(error instanceof ApiError || error instanceof Error ? error.message : "Unable to delete record.");
    } finally {
      setDeleting(false);
    }
  }

  const label = `${type === "create" ? "Add" : type === "update" ? "Edit" : "Delete"} ${table}`;
  const Icon = type === "create" ? PlusIcon : type === "update" ? PencilIcon : TrashIcon;

  return (
    <>
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={() => { setDeleteError(""); setOpen(true); }}
        className={`${buttonStyle[type]} flex items-center justify-center rounded-full transition-colors shrink-0`}
      >
        <Icon className={type === "create" ? "w-5 h-5" : "w-4 h-4"} />
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <div className="bg-white p-6 rounded-xl relative w-full max-w-2xl shadow-xl">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
            {type === "delete" ? (
              <div className="p-4 flex flex-col items-center gap-4 text-center">
                <p className="font-medium">All data will be lost. Are you sure you want to delete this {table}?</p>
                {deleteError && <p className="text-sm text-red-600" role="alert">{deleteError}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setOpen(false)} className="py-2 px-4 rounded-md border border-gray-300">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="bg-red-700 text-white py-2 px-4 rounded-md disabled:opacity-60"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ) : (
              <EntityForm table={table} type={type} data={data} onSuccess={handleSuccess} />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;
