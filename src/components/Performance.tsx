"use client";

import { useEffect, useMemo, useState } from "react";
import { Pie, PieChart, ResponsiveContainer } from "recharts";
import { apiFetch, type ResultRecord } from "@/lib/api";
import { useLookups } from "@/lib/lookups";

type PerformanceProps = {
  // Average of this student's results…
  studentId?: string;
  // …or of all results on exams/assignments in this teacher's lessons.
  teacherId?: string;
};

// Average score as a percentage. Exam scores are scaled by the exam's
// max_score; assignments have no maximum, so their score is taken as a %.
const Performance = ({ studentId, teacherId }: PerformanceProps) => {
  const lookups = useLookups();
  const [results, setResults] = useState<ResultRecord[]>([]);

  useEffect(() => {
    apiFetch<{ data: ResultRecord[] }>("/results?pageSize=100")
      .then((response) => setResults(response.data ?? []))
      .catch(() => setResults([]));
  }, []);

  const average = useMemo(() => {
    const exams = new Map(lookups.exams.map((e) => [e.id, e]));
    const assignments = new Map(lookups.assignments.map((a) => [a.id, a]));
    const lessons = new Map(lookups.lessons.map((l) => [l.id, l]));
    const percentages = results.flatMap((r) => {
      if (studentId && r.student_id !== studentId) return [];
      const exam = r.exam_id ? exams.get(r.exam_id) : undefined;
      const lessonId = exam?.lesson_id ?? (r.assignment_id ? assignments.get(r.assignment_id)?.lesson_id : undefined);
      if (teacherId && (!lessonId || lessons.get(lessonId)?.teacher_id !== teacherId)) return [];
      const pct = exam ? (Number(r.score) / Number(exam.max_score || 100)) * 100 : Number(r.score);
      return Number.isFinite(pct) ? [Math.min(Math.max(pct, 0), 100)] : [];
    });
    return percentages.length ? { value: percentages.reduce((a, b) => a + b, 0) / percentages.length, count: percentages.length } : null;
  }, [results, lookups, studentId, teacherId]);

  const value = average?.value ?? 0;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm h-80 relative">
      <h2 className="text-xl font-semibold">Performance</h2>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            dataKey="value"
            startAngle={180}
            endAngle={0}
            data={[
              { name: "Score", value, fill: "#C3EBFA" },
              { name: "Remaining", value: 100 - value, fill: "#FAE27C" },
            ]}
            cx="50%"
            cy="50%"
            innerRadius={70}
            isAnimationActive={false}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="text-3xl font-bold">{average ? `${Math.round(value)}%` : "—"}</p>
        <p className="text-xs text-gray-400">{average ? "average score" : "no results yet"}</p>
      </div>
      <p className="font-medium absolute bottom-3 left-0 right-0 text-center text-sm text-gray-500">
        {average ? `Across ${average.count} result${average.count === 1 ? "" : "s"}` : studentId ? "Scores appear once results are published" : "Scores from this teacher's lessons"}
      </p>
    </div>
  );
};

export default Performance;
