"use client";

import Announcements from "@/components/Announcements";
import BigCalendar from "@/components/BigCalendar";
import Image from "next/image";
import Link from "next/link";
import Performance from "@/components/Performance";
import FormModal from "@/components/FormModal";
import { MapPinIcon } from "@/components/Icons";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { TeacherRecord, LessonRecord } from "@/lib/api";

const SingleTeacherPageContent = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [teacher, setTeacher] = useState<TeacherRecord | null>(null);
  const [lessonCount, setLessonCount] = useState<number | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    apiFetch<{ data: TeacherRecord }>(`/teachers/${id}`)
      .then((response) => {
        setTeacher(response.data);
        return apiFetch<{ data: LessonRecord[] }>(`/lessons?teacherId=${response.data.id}`)
          .then((lessons) => setLessonCount(lessons.data.length))
          .catch(() => undefined);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, version]);

  if (loading) {
    return (
      <div className="bg-lamaSkyLight min-h-screen p-6 flex items-center justify-center">
        <p className="text-lamaSky/70">Loading teacher...</p>
      </div>
    );
  }

  if (notFound || !teacher) {
    return (
      <div className="bg-lamaSkyLight min-h-screen p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-lamaSky mb-4">Teacher Not Found</h1>
          <p className="text-lg text-lamaSky/70 mb-6">
            The requested teacher does not exist in our records
          </p>
          <Link
            href="/list/teachers"
            className="inline-block px-6 py-3 bg-lamaPurple text-white rounded-lg hover:bg-lamaPurpleDark transition-colors"
          >
            Back to Teachers List
          </Link>
        </div>
      </div>
    );
  }

  const name = teacher.profiles ? `${teacher.profiles.first_name} ${teacher.profiles.last_name}` : "Unnamed teacher";
  const photo = teacher.profiles?.avatar_path || "/teacher.png";

  return (
    <div className="bg-lamaSkyLight min-h-screen p-6">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
        {/* LEFT COLUMN */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6">
          {/* USER PROFILE SECTION */}
          <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col md:flex-row gap-6">
            {/* AVATAR */}
            <div className="flex justify-center md:justify-start">
              <div className="relative">
                <Image
                  src={photo}
                  alt={name}
                  width={144}
                  height={144}
                  className="w-32 h-32 rounded-full object-cover border-4 border-lamaSkyLight"
                />
              </div>
            </div>

            {/* USER INFO */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-lamaSky">{name}</h1>
                  <p className="text-lamaSky/70 mt-1">
                    {teacher.employee_number}
                  </p>
                </div>
                <div className="flex gap-3">
                  <FormModal table="teacher" type="update" data={teacher} onSuccess={() => setVersion((v) => v + 1)} />
                </div>
              </div>

              {/* CONTACT INFO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-lamaSkyLight flex items-center justify-center">
                    <Image
                      src="/phone.png"
                      alt="Phone"
                      width={16}
                      height={16}
                      className="opacity-70"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-lamaSky/60">Phone</p>
                    <p className="text-lamaSky font-medium">{teacher.profiles?.phone || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-lamaSkyLight flex items-center justify-center">
                    <Image
                      src="/date.png"
                      alt="Employee number"
                      width={16}
                      height={16}
                      className="opacity-70"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-lamaSky/60">Teacher ID</p>
                    <p className="text-lamaSky font-medium">{teacher.employee_number}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-lamaSkyLight flex items-center justify-center">
                    <Image
                      src="/singleLesson.png"
                      alt="Lessons"
                      width={16}
                      height={16}
                      className="opacity-70"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-lamaSky/60">Lessons</p>
                    <p className="text-lamaSky font-medium">{lessonCount ?? "-"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-lamaSkyLight flex items-center justify-center">
                    <MapPinIcon className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-lamaSky/60">Address</p>
                    <p className="text-lamaSky font-medium">{teacher.profiles?.address || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CALENDAR SECTION */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-lamaSky">Teaching Schedule</h2>
            </div>
            <div className="h-[500px]">
              <BigCalendar teacherId={teacher.id} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          {/* QUICK LINKS */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-lamaSky mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/list/classes"
                className="p-4 rounded-xl bg-lamaSkyLight flex flex-col items-center justify-center text-center hover:bg-lamaSkyLight/80 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center mb-2 group-hover:bg-lamaSkyLight transition-colors">
                  <Image
                    src="/class.png"
                    alt="Classes"
                    width={24}
                    height={24}
                  />
                </div>
                <span className="text-lamaSky font-medium">Classes</span>
              </Link>

              <Link
                href="/list/students"
                className="p-4 rounded-xl bg-lamaPurpleLight flex flex-col items-center justify-center text-center hover:bg-lamaPurpleLight/80 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center mb-2 group-hover:bg-lamaPurpleLight transition-colors">
                  <Image
                    src="/student.png"
                    alt="Students"
                    width={24}
                    height={24}
                  />
                </div>
                <span className="text-lamaSky font-medium">Students</span>
              </Link>

              <Link
                href="/list/lessons"
                className="p-4 rounded-xl bg-lamaYellowLight flex flex-col items-center justify-center text-center hover:bg-lamaYellowLight/80 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center mb-2 group-hover:bg-lamaYellowLight transition-colors">
                  <Image
                    src="/lesson.png"
                    alt="Lessons"
                    width={24}
                    height={24}
                  />
                </div>
                <span className="text-lamaSky font-medium">Lessons</span>
              </Link>

              <Link
                href="/list/exams"
                className="p-4 rounded-xl bg-pink-50 flex flex-col items-center justify-center text-center hover:bg-pink-100 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center mb-2 group-hover:bg-pink-100 transition-colors">
                  <Image
                    src="/exam.png"
                    alt="Exams"
                    width={24}
                    height={24}
                  />
                </div>
                <span className="text-lamaSky font-medium">Exams</span>
              </Link>
            </div>
          </div>

          {/* PERFORMANCE */}
          <Performance teacherId={teacher.id} />

          {/* ANNOUNCEMENTS */}
          <Announcements />
        </div>
      </div>
    </div>
  );
};

const SingleTeacherPage = () => (
  <Suspense fallback={<div className="bg-lamaSkyLight min-h-screen p-6 flex items-center justify-center"><p className="text-lamaSky/70">Loading teacher...</p></div>}>
    <SingleTeacherPageContent />
  </Suspense>
);

export default SingleTeacherPage;
