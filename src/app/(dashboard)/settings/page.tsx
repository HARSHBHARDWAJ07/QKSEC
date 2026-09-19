"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Inputs = z.infer<typeof schema>;

export default function SettingsPage() {
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Inputs>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setStatus(null);
    setSubmitting(true);
    try {
      await apiFetch("/auth/change-password", undefined, {
        method: "POST",
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      setStatus({ type: "success", message: "Password changed successfully." });
      reset();
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof ApiError ? error.message : "Unable to change password",
      });
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="p-4 flex flex-col gap-6 max-w-2xl">
      <h1 className="text-xl font-semibold">Settings</h1>

      <form onSubmit={onSubmit} className="bg-white rounded-md p-6 shadow-sm flex flex-col gap-4">
        <h2 className="text-lg font-medium">Change password</h2>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">Current password</label>
          <input
            type="password"
            autoComplete="current-password"
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("currentPassword")}
          />
          {errors.currentPassword && <p className="text-xs text-red-400">{errors.currentPassword.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">New password</label>
          <input
            type="password"
            autoComplete="new-password"
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("newPassword")}
          />
          {errors.newPassword && <p className="text-xs text-red-400">{errors.newPassword.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">Confirm new password</label>
          <input
            type="password"
            autoComplete="new-password"
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
        </div>

        {status && (
          <p className={`text-sm ${status.type === "success" ? "text-green-600" : "text-red-500"}`}>
            {status.message}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-lamaSky text-white p-3 rounded-md w-full md:w-48 disabled:opacity-60"
        >
          {submitting ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
