"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api";
import { resetCurrentUser } from "@/lib/useCurrentUser";

type MeResponse = {
  user: { id: string; email?: string; role?: string };
  profile: {
    id: string;
    role: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    address?: string | null;
    avatar_path?: string | null;
    date_of_birth?: string | null;
    sex?: "male" | "female" | null;
    blood_type?: string | null;
  };
};

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  dateOfBirth: z.string().trim().optional(),
  // "" is the "Not set" option.
  sex: z.union([z.enum(["male", "female"]), z.literal("")]).optional(),
  bloodType: z.string().trim().optional(),
});

type Inputs = z.infer<typeof schema>;

export default function ProfilePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Inputs>({ resolver: zodResolver(schema) });

  useEffect(() => {
    let active = true;
    apiFetch<MeResponse>("/auth/me")
      .then((data) => {
        if (!active) return;
        setMe(data);
        reset({
          firstName: data.profile.first_name ?? "",
          lastName: data.profile.last_name ?? "",
          phone: data.profile.phone ?? "",
          address: data.profile.address ?? "",
          dateOfBirth: data.profile.date_of_birth ?? "",
          sex: data.profile.sex ?? "",
          bloodType: data.profile.blood_type ?? "",
        });
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error instanceof ApiError ? error.message : "Unable to load profile");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reset]);

  const onSubmit = handleSubmit(async (values) => {
    setStatus(null);
    setSubmitting(true);
    try {
      const response = await apiFetch<{ data: MeResponse["profile"] }>("/auth/profile", undefined, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone || null,
          address: values.address || null,
          dateOfBirth: values.dateOfBirth || null,
          sex: values.sex || null,
          bloodType: values.bloodType || null,
        }),
      });
      setMe((prev) => (prev ? { ...prev, profile: response.data } : prev));
      resetCurrentUser();
      setStatus({ type: "success", message: "Profile updated successfully." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof ApiError ? error.message : "Unable to update profile",
      });
    } finally {
      setSubmitting(false);
    }
  });

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading profile...</div>;
  }

  if (loadError || !me) {
    return <div className="p-4 text-sm text-red-500">{loadError || "Profile unavailable"}</div>;
  }

  return (
    <div className="p-4 flex flex-col gap-6 max-w-3xl">
      <div className="bg-white rounded-md p-6 flex items-center gap-4 shadow-sm">
        <Image
          src={me.profile.avatar_path || "/avatar.png"}
          alt=""
          width={64}
          height={64}
          className="rounded-full object-cover"
        />
        <div>
          <h1 className="text-xl font-semibold">
            {me.profile.first_name} {me.profile.last_name}
          </h1>
          <p className="text-sm text-gray-500">{me.user.email}</p>
          <span className="inline-block mt-1 text-[10px] uppercase tracking-wide bg-lamaSkyLight text-lamaSky px-2 py-1 rounded-full">
            {me.profile.role}
          </span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-md p-6 shadow-sm flex flex-col gap-6">
        <h2 className="text-lg font-medium">Personal information</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-2 w-full md:w-[calc(50%-8px)]">
            <label className="text-xs text-gray-500">First name</label>
            <input
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
              {...register("firstName")}
            />
            {errors.firstName && <p className="text-xs text-red-400">{errors.firstName.message}</p>}
          </div>
          <div className="flex flex-col gap-2 w-full md:w-[calc(50%-8px)]">
            <label className="text-xs text-gray-500">Last name</label>
            <input
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
              {...register("lastName")}
            />
            {errors.lastName && <p className="text-xs text-red-400">{errors.lastName.message}</p>}
          </div>
          <div className="flex flex-col gap-2 w-full md:w-[calc(50%-8px)]">
            <label className="text-xs text-gray-500">Phone</label>
            <input className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full" {...register("phone")} />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-[calc(50%-8px)]">
            <label className="text-xs text-gray-500">Address</label>
            <input className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full" {...register("address")} />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-[calc(50%-8px)]">
            <label className="text-xs text-gray-500">Date of birth</label>
            <input
              type="date"
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
              {...register("dateOfBirth")}
            />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-[calc(50%-8px)]">
            <label className="text-xs text-gray-500">Sex</label>
            <select className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full" {...register("sex")}>
              <option value="">Not set</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-[calc(50%-8px)]">
            <label className="text-xs text-gray-500">Blood type</label>
            <input
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
              {...register("bloodType")}
            />
          </div>
        </div>

        {status && (
          <p className={`text-sm ${status.type === "success" ? "text-green-600" : "text-red-500"}`}>
            {status.message}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-lamaSky text-white p-3 rounded-md w-full md:w-40 disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
