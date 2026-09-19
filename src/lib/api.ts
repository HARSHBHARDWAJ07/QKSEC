export type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type StudentRecord = {
  id: string;
  student_number: string;
  enrollment_date: string;
  active: boolean;
  class_id: string;
  profile_id: string;
  profiles: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    phone?: string | null;
    address?: string | null;
    avatar_path?: string | null;
  } | null;
};

export type StudentsResponse = Paginated<StudentRecord>;

export type TeacherRecord = {
  id: string;
  employee_number: string;
  active: boolean;
  profile_id: string;
  profiles: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    address?: string | null;
    avatar_path?: string | null;
  } | null;
};

export type AnnouncementRecord = {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
  expires_at: string | null;
};

export type EventRecord = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  class_id: string | null;
};

export type AssignmentRecord = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  due_at: string;
  attachment_path: string | null;
  lesson_id: string;
  created_by: string | null;
};

export type LessonRecord = {
  id: string;
  name: string;
  weekday: number;
  start_time: string;
  end_time: string;
  subject_id: string;
  class_id: string;
  teacher_id: string;
  subjects: { id: string; name: string } | null;
  classes: { id: string; name: string } | null;
  teachers: { id: string; employee_number: string } | null;
};

export type SubjectRecord = {
  id: string;
  name: string;
};

export type ClassRecord = {
  id: string;
  name: string;
  capacity: number;
  academic_year_id: string;
  grade_id: string;
  supervisor_id: string | null;
  grades: { id: string; level: number } | null;
  teachers: {
    id: string;
    employee_number: string;
    profiles: { id: string; first_name: string; last_name: string } | null;
  } | null;
};

export type ExamRecord = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  max_score: number;
  lesson_id: string;
  created_by: string | null;
};

export type ResultRecord = {
  id: string;
  student_id: string;
  exam_id: string | null;
  assignment_id: string | null;
  score: number;
  grade: string | null;
  feedback: string | null;
  published_at: string | null;
};

export type ParentRecord = {
  id: string;
  active: boolean;
  profile_id: string;
  profiles: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    address?: string | null;
  } | null;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as ApiErrorPayload;
    throw new ApiError(
      payload.error?.message ?? "The API request failed",
      response.status,
      payload.error?.code,
      payload.error?.details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}