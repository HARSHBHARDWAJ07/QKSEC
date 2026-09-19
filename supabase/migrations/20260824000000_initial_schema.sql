create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'teacher', 'student', 'parent');
create type public.user_sex as enum ('male', 'female');
create type public.attendance_status as enum ('present', 'absent', 'late', 'excused');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  first_name text not null,
  last_name text not null,
  phone text,
  address text,
  avatar_path text,
  date_of_birth date,
  sex public.user_sex,
  blood_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  constraint academic_year_dates_valid check (ends_on > starts_on)
);

create unique index one_current_academic_year
  on public.academic_years (is_current)
  where is_current = true;

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  level integer not null unique check (level > 0),
  created_at timestamptz not null default now()
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  employee_number text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.parents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id),
  grade_id uuid not null references public.grades(id),
  name text not null,
  capacity integer not null check (capacity > 0),
  supervisor_id uuid references public.teachers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, name)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  student_number text not null unique,
  class_id uuid not null references public.classes(id),
  enrollment_date date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teacher_subjects (
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  primary key (teacher_id, subject_id)
);

create table public.teacher_classes (
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  primary key (teacher_id, class_id)
);

create table public.parent_students (
  parent_id uuid not null references public.parents(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  relationship text not null default 'parent',
  is_primary boolean not null default false,
  primary key (parent_id, student_id)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  subject_id uuid not null references public.subjects(id),
  class_id uuid not null references public.classes(id),
  teacher_id uuid not null references public.teachers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_time_valid check (end_time > start_time),
  unique (class_id, teacher_id, subject_id, weekday, start_time)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_at timestamptz not null,
  due_at timestamptz not null,
  attachment_path text,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_dates_valid check (due_at >= start_at)
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_score numeric(6, 2) not null default 100 check (max_score > 0),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_dates_valid check (ends_at > starts_at)
);

create table public.results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  score numeric(6, 2) not null check (score >= 0),
  grade text,
  feedback text,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint result_has_one_assessment check (num_nonnulls(exam_id, assignment_id) = 1)
);

create unique index one_result_per_exam_student
  on public.results (exam_id, student_id)
  where exam_id is not null;

create unique index one_result_per_assignment_student
  on public.results (assignment_id, student_id)
  where assignment_id is not null;

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  attendance_date date not null,
  status public.attendance_status not null,
  marked_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, lesson_id, attendance_date)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  class_id uuid references public.classes(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint event_dates_valid check (ends_at > starts_at)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published_at timestamptz,
  expires_at timestamptz,
  published_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcement_dates_valid check (expires_at is null or published_at is null or expires_at > published_at)
);

create table public.announcement_classes (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  primary key (announcement_id, class_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['profiles', 'classes', 'students', 'lessons', 'assignments', 'exams', 'results', 'attendance_records', 'announcements'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', 'set_' || table_name || '_updated_at', table_name);
  end loop;
end;
$$;

create index students_class_id_idx on public.students(class_id);
create index students_profile_id_idx on public.students(profile_id);
create index teachers_profile_id_idx on public.teachers(profile_id);
create index lessons_class_weekday_idx on public.lessons(class_id, weekday);
create index lessons_teacher_weekday_idx on public.lessons(teacher_id, weekday);
create index assignments_due_at_idx on public.assignments(due_at);
create index exams_starts_at_idx on public.exams(starts_at);
create index results_student_id_idx on public.results(student_id);
create index attendance_student_date_idx on public.attendance_records(student_id, attendance_date);
create index events_starts_at_idx on public.events(starts_at);
create index announcements_published_at_idx on public.announcements(published_at);

comment on table public.profiles is 'Application profile linked to Supabase Auth; credentials remain in auth.users.';
