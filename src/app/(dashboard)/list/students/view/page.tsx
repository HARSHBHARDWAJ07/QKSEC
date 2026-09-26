"use client";

import Announcements from "@/components/Announcements";
import BigCalendar from "@/components/BigCalendar";
import Image from "next/image";
import Link from "next/link";
import Performance from "@/components/Performance";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import FormModal from "@/components/FormModal";
import { MapPinIcon } from "@/components/Icons";
import { useCurrentUser } from "@/lib/useCurrentUser";
import type { StudentRecord, ClassRecord } from "@/lib/api";

const SingleStudentPageContent = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [studentClass, setStudentClass] = useState<ClassRecord | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const { role } = useCurrentUser();

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    apiFetch<{ data: StudentRecord }>(`/students/${id}`)
      .then((response) => {
        setStudent(response.data);
        return apiFetch<{ data: ClassRecord }>(`/classes/${response.data.class_id}`)
          .then((classResponse) => setStudentClass(classResponse.data))
          .catch(() => undefined);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, version]);

  if (loading) {
    return (
      <div className="bg-lamaSkyLight min-h-screen p-6 flex items-center justify-center">
        <p className="text-lamaSky/70">Loading student...</p>
      </div>
    );
  }

  if (notFound || !student) {
    return (
      <div className="bg-lamaSkyLight min-h-screen p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-lamaSky mb-4">Student Not Found</h1>
          <p className="text-lg text-lamaSky/70 mb-6">
            The requested student does not exist in our records
          </p>
          <Link
            href="/list/students"
            className="inline-block px-6 py-3 bg-lamaPurple text-white rounded-lg hover:bg-lamaPurpleDark transition-colors"
          >
            Back to Students List
          </Link>
        </div>
      </div>
    );
  }

  const name = student.profiles ? `${student.profiles.first_name} ${student.profiles.last_name}` : "Unnamed student";
  const photo = student.profiles?.avatar_path || "/student.png";
  const className = studentClass?.name ?? "-";
  const gradeLevel = studentClass?.grades?.level ?? "-";

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
                    Class {className} • Grade {gradeLevel}
                  </p>
                </div>
                <div className="flex gap-3">
                  {role === "admin" && <FormModal table="student" type="update" data={student} onSuccess={() => setVersion((v) => v + 1)} />}
                </div>
              </div>

              {/* CONTACT INFO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-lamaSkyLight flex items-center justify-center">
                    <Image
                      src="/mail.png"
                      alt="Student number"
                      width={16}
                      height={16}
                      className="opacity-70"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-lamaSky/60">Student ID</p>
                    <p className="text-lamaSky font-medium">
                      {student.student_number}
                    </p>
                  </div>
                </div>

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
                    <p className="text-lamaSky font-medium">
                      {student.profiles?.phone || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-lamaSkyLight flex items-center justify-center">
                    <Image
                      src="/date.png"
                      alt="Enrollment"
                      width={16}
                      height={16}
                      className="opacity-70"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-lamaSky/60">Enrollment Date</p>
                    <p className="text-lamaSky font-medium">
                      {new Date(student.enrollment_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-lamaSkyLight flex items-center justify-center">
                    <MapPinIcon className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-lamaSky/60">Address</p>
                    <p className="text-lamaSky font-medium">
                      {student.profiles?.address || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CALENDAR SECTION */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-lamaSky">Academic Schedule</h2>
            </div>
            <div className="h-[500px]">
              <BigCalendar classId={student.class_id} />
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
                href="/list/lessons"
                className="p-4 rounded-xl bg-lamaSkyLight flex flex-col items-center justify-center text-center hover:bg-lamaSkyLight/80 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center mb-2 group-hover:bg-lamaSkyLight transition-colors">
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
                href="/list/teachers"
                className="p-4 rounded-xl bg-lamaPurpleLight flex flex-col items-center justify-center text-center hover:bg-lamaPurpleLight/80 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center mb-2 group-hover:bg-lamaPurpleLight transition-colors">
                  <Image
                    src="/teacher.png"
                    alt="Teachers"
                    width={24}
                    height={24}
                  />
                </div>
                <span className="text-lamaSky font-medium">Teachers</span>
              </Link>

              <Link
                href="/list/assignments"
                className="p-4 rounded-xl bg-lamaYellowLight flex flex-col items-center justify-center text-center hover:bg-lamaYellowLight/80 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center mb-2 group-hover:bg-lamaYellowLight transition-colors">
                  <Image
                    src="/assignment.png"
                    alt="Assignments"
                    width={24}
                    height={24}
                  />
                </div>
                <span className="text-lamaSky font-medium">Assignments</span>
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
          <Performance studentId={student.id} />

          {/* ANNOUNCEMENTS */}
          <Announcements />
        </div>
      </div>
    </div>
  );
};

const SingleStudentPage = () => (
  <Suspense fallback={<div className="bg-lamaSkyLight min-h-screen p-6 flex items-center justify-center"><p className="text-lamaSky/70">Loading student...</p></div>}>
    <SingleStudentPageContent />
  </Suspense>
);

export default SingleStudentPage;
