"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  Bar, BarChart, CartesianGrid, Legend, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import Announcements from "./Announcements";
import { apiFetch, type EventRecord, type PaginationMeta } from "@/lib/api";
import { formatDate, formatTime, useLookups, WEEKDAYS } from "@/lib/lookups";

type Counts = { teachers: number; students: number; parents: number; classes: number };
type AttendanceRow = { attendance_date: string; status: "present" | "absent" | "late" | "excused" };

const card = "bg-white rounded-xl shadow-sm p-5";

function isoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d;
}

const AdminDashboard = () => {
  const lookups = useLookups();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  useEffect(() => {
    const total = (path: string) =>
      apiFetch<{ meta?: PaginationMeta }>(`${path}?pageSize=1`).then((r) => r.meta?.total ?? 0).catch(() => 0);
    Promise.all([total("/teachers"), total("/students"), total("/parents"), total("/classes")])
      .then(([teachers, students, parents, classes]) => setCounts({ teachers, students, parents, classes }));

    const monday = startOfWeek(new Date());
    apiFetch<{ data: AttendanceRow[] }>(`/attendance?pageSize=100&from=${isoDate(monday)}&to=${isoDate(new Date())}`)
      .then((r) => setAttendance(r.data ?? []))
      .catch(() => undefined);

    apiFetch<{ data: EventRecord[] }>("/events?pageSize=100")
      .then((r) => setEvents(r.data ?? []))
      .catch(() => undefined);
  }, []);

  const currentYear = lookups.academicYears.find((y) => y.is_current)?.name ?? "";

  const gender = useMemo(() => {
    const boys = lookups.students.filter((s) => s.profiles?.sex === "male").length;
    const girls = lookups.students.filter((s) => s.profiles?.sex === "female").length;
    return { boys, girls, other: lookups.students.length - boys - girls, total: lookups.students.length };
  }, [lookups.students]);

  const weekly = useMemo(() => WEEKDAYS.slice(0, 6).map((day, index) => {
    const rows = attendance.filter((row) => (new Date(`${row.attendance_date}T00:00:00`).getDay() + 6) % 7 === index);
    const present = rows.filter((row) => row.status === "present" || row.status === "late").length;
    return { name: day, present, absent: rows.length - present };
  }), [attendance]);

  const enrollment = useMemo(() => [...lookups.classes]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((c) => ({ name: c.name, enrolled: lookups.students.filter((s) => s.class_id === c.id).length, capacity: c.capacity })),
  [lookups.classes, lookups.students]);

  const dayEvents = events
    .filter((e) => isoDate(new Date(e.starts_at)) === isoDate(selectedDay))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const upcoming = events
    .filter((e) => new Date(e.ends_at) >= new Date())
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 3);
  const eventDays = new Set(events.map((e) => isoDate(new Date(e.starts_at))));
  const shownEvents = dayEvents.length > 0 ? dayEvents : upcoming;

  const pct = (n: number) => (gender.total ? Math.round((n / gender.total) * 100) : 0);

  return (
    <div className="p-4 md:p-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* COUNT CARDS */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:col-span-4">
        {([
          ["Teachers", counts?.teachers, "/list/teachers"],
          ["Students", counts?.students, "/list/students"],
          ["Parents", counts?.parents, "/list/parents"],
          ["Classes", counts?.classes, "/list/classes"],
        ] as const).map(([label, value, href], index) => (
          <Link key={label} href={href} className={`rounded-2xl p-4 transition-transform hover:-translate-y-0.5 ${index % 2 === 0 ? "bg-lamaPurple text-white" : "bg-lamaYellow text-lamaSky"}`}>
            {currentYear && <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600">{currentYear}</span>}
            <p className="text-2xl font-semibold my-4">{value ?? "…"}</p>
            <p className={`text-sm font-medium ${index % 2 === 0 ? "text-white/70" : "text-lamaSky/70"}`}>{label}</p>
          </Link>
        ))}
      </div>

      <div className="lg:col-span-3 flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* STUDENTS BY GENDER */}
          <div className={`${card} h-[380px] flex flex-col`}>
            <h2 className="text-lg font-semibold">Students</h2>
            <div className="relative flex-1 min-h-0">
              <ResponsiveContainer>
                <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="100%" barSize={24} data={[
                  { name: "Total", count: gender.total || 1, fill: "white" },
                  { name: "Girls", count: gender.girls, fill: "#FAE27C" },
                  { name: "Boys", count: gender.boys, fill: "#C3EBFA" },
                ]}>
                  <RadialBar background dataKey="count" />
                </RadialBarChart>
              </ResponsiveContainer>
              <Image src="/maleFemale.png" alt="" width={50} height={50} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="flex justify-center gap-10">
              <div className="flex flex-col gap-1 items-center">
                <span className="w-4 h-4 bg-[#C3EBFA] rounded-full" />
                <p className="font-bold">{gender.boys}</p>
                <p className="text-xs text-gray-400">Boys ({pct(gender.boys)}%)</p>
              </div>
              <div className="flex flex-col gap-1 items-center">
                <span className="w-4 h-4 bg-[#FAE27C] rounded-full" />
                <p className="font-bold">{gender.girls}</p>
                <p className="text-xs text-gray-400">Girls ({pct(gender.girls)}%)</p>
              </div>
            </div>
            {gender.other > 0 && <p className="text-center text-xs text-gray-400 mt-1">{gender.other} without gender on record</p>}
          </div>

          {/* WEEKLY ATTENDANCE */}
          <div className={`${card} h-[380px] md:col-span-2 flex flex-col`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Attendance this week</h2>
              <Link href="/list/attendance" className="text-xs text-gray-500 hover:underline">View all</Link>
            </div>
            {attendance.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">No attendance marked this week yet.</div>
            ) : (
              <div className="flex-1 min-h-0">
                <ResponsiveContainer>
                  <BarChart data={weekly} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ddd" />
                    <XAxis dataKey="name" axisLine={false} tick={{ fill: "#6b7280" }} tickLine={false} />
                    <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "#6b7280" }} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }} />
                    <Legend align="left" verticalAlign="top" wrapperStyle={{ paddingTop: "10px", paddingBottom: "20px" }} />
                    <Bar dataKey="present" name="Present" fill="#FAE27C" radius={[10, 10, 0, 0]} />
                    <Bar dataKey="absent" name="Absent" fill="#C3EBFA" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* CLASS ENROLLMENT */}
        <div className={`${card} h-[420px] flex flex-col`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Class enrollment</h2>
            <Link href="/list/classes" className="text-xs text-gray-500 hover:underline">View classes</Link>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer>
              <BarChart data={enrollment} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ddd" />
                <XAxis dataKey="name" axisLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} tickLine={false} interval={0} />
                <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "#6b7280" }} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }} />
                <Legend align="left" verticalAlign="top" wrapperStyle={{ paddingTop: "10px", paddingBottom: "20px" }} />
                <Bar dataKey="enrolled" name="Enrolled" fill="#2A2550" radius={[6, 6, 0, 0]} />
                <Bar dataKey="capacity" name="Capacity" fill="#D4AF37" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex flex-col gap-6">
        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Events</h2>
            <Link href="/list/events" className="text-xs text-gray-500 hover:underline">View all</Link>
          </div>
          <Calendar
            onChange={(value) => value instanceof Date && setSelectedDay(value)}
            value={selectedDay}
            tileClassName={({ date }) => (eventDays.has(isoDate(date)) ? "font-bold !text-lamaPurple underline" : undefined)}
          />
          <p className="text-xs text-gray-500 mt-4 mb-2">
            {dayEvents.length > 0 ? `Events on ${formatDate(selectedDay.toISOString())}` : "Upcoming events"}
          </p>
          <div className="flex flex-col gap-3">
            {shownEvents.length === 0 && <p className="text-sm text-gray-400">No upcoming events.</p>}
            {shownEvents.map((event, index) => (
              <div key={event.id} className={`p-3 rounded-md border-2 border-gray-100 border-t-4 ${index % 2 === 0 ? "border-t-lamaSky" : "border-t-lamaYellow"}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-700">{event.title}</h3>
                  <span className="text-gray-400 text-xs whitespace-nowrap">{formatDate(event.starts_at)} · {formatTime(event.starts_at)}</span>
                </div>
                {event.description && <p className="mt-1 text-gray-500 text-sm">{event.description}</p>}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm">
          <Announcements />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
