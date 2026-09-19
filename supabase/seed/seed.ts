import { supabaseAdmin } from "../../backend/src/config/supabase.js";

type Role = "admin" | "teacher" | "student" | "parent";

type SeedUser = {
  email: string;
  password: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  avatarPath?: string;
};

const seedPassword = process.env.SEED_USER_PASSWORD;

if (!seedPassword || seedPassword.length < 8) {
  throw new Error("SEED_USER_PASSWORD must be set and contain at least 8 characters");
}

const validSeedPassword = seedPassword;

async function getOrCreateAuthUser(user: SeedUser, cache: Map<string, string>) {
  const cached = cache.get(user.email);
  if (cached) return cached;

  const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  const existingUser = existingUsers.users.find((item) => item.email === user.email);
  let id = existingUser?.id;

  if (!id) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });
    if (error) throw error;
    id = data.user.id;
  }
  if (!id) throw new Error(`Unable to create ${user.email}`);
  cache.set(user.email, id);
  return id;
}

async function requireData<T>(result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null || result.data === undefined) {
    throw new Error("Supabase returned no data");
  }
  return result.data;
}

// ── Mock data mirrored from src/lib/data.ts ──────────────────────────────────

const mockTeachers = [
  { name: "Rajesh Sharma", email: "teacher1@qksec.local", phone: "9876543210", subjects: ["Math", "Geometry", "Algebra"], classes: ["1B", "2A", "3C", "4D"], address: "45 Gandhi Road, Mumbai, Maharashtra 400001", photo: "https://images.pexels.com/photos/2888150/pexels-photo-2888150.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Priya Patel", email: "teacher2@qksec.local", phone: "8765432109", subjects: ["Physics", "Chemistry", "Science"], classes: ["5A", "6B", "7C"], address: "7 Nehru Nagar, Delhi 110024", photo: "https://images.pexels.com/photos/936126/pexels-photo-936126.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Vikram Singh", email: "teacher3@qksec.local", phone: "7654321098", subjects: ["Biology", "Environmental Science"], classes: ["8A", "9B", "10C"], address: "22 Tagore Lane, Kolkata, West Bengal 700071", photo: "https://images.pexels.com/photos/428328/pexels-photo-428328.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Ananya Reddy", email: "teacher4@qksec.local", phone: "6543210987", subjects: ["History", "Civics", "Social Studies"], classes: ["11A", "12B"], address: "33 Cubbon Road, Bangalore, Karnataka 560001", photo: "https://images.pexels.com/photos/1187765/pexels-photo-1187765.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Arjun Mehta", email: "teacher5@qksec.local", phone: "9432109876", subjects: ["Music", "History", "Performing Arts"], classes: ["5A", "6B", "7C"], address: "12 Marina Beach Road, Chennai, Tamil Nadu 600005", photo: "https://images.pexels.com/photos/1102341/pexels-photo-1102341.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Kavita Desai", email: "teacher6@qksec.local", phone: "8321098765", subjects: ["Physics", "Advanced Physics"], classes: ["8A", "9B", "10C"], address: "8 Sabarmati Society, Ahmedabad, Gujarat 380009", photo: "https://images.pexels.com/photos/712513/pexels-photo-712513.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Rohit Verma", email: "teacher7@qksec.local", phone: "7210987654", subjects: ["English", "Spanish", "Literature"], classes: ["11A", "12B"], address: "19 Cyber City, Gurgaon, Haryana 122002", photo: "https://images.pexels.com/photos/1438081/pexels-photo-1438081.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Sunita Iyer", email: "teacher8@qksec.local", phone: "6109876543", subjects: ["Math", "Geometry", "Calculus"], classes: ["1B", "2A", "3C"], address: "27 Banjara Hills, Hyderabad, Telangana 500034", photo: "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Sanjay Kumar", email: "teacher9@qksec.local", phone: "9098765432", subjects: ["Literature", "English", "Creative Writing"], classes: ["4D", "5A"], address: "54 Vaishali Nagar, Jaipur, Rajasthan 302021", photo: "https://images.pexels.com/photos/842980/pexels-photo-842980.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Neha Gupta", email: "teacher10@qksec.local", phone: "8987654321", subjects: ["Biology", "Zoology", "Botany"], classes: ["6B", "7C"], address: "3 MG Road, Pune, Maharashtra 411001", photo: "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=1200" },
];

const mockStudents = [
  { name: "Amit Joshi", email: "student1@qksec.local", phone: "9876543210", class: "1B", address: "45 Gandhi Road, Mumbai, Maharashtra 400001", photo: "https://images.pexels.com/photos/2888150/pexels-photo-2888150.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Sneha Menon", email: "student2@qksec.local", phone: "8765432109", class: "5A", address: "7 Nehru Nagar, Delhi 110024", photo: "https://images.pexels.com/photos/936126/pexels-photo-936126.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Rahul Nair", email: "student3@qksec.local", phone: "7654321098", class: "5A", address: "22 Tagore Lane, Kolkata, West Bengal 700071", photo: "https://images.pexels.com/photos/428328/pexels-photo-428328.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Divya Rao", email: "student4@qksec.local", phone: "6543210987", class: "5A", address: "33 Cubbon Road, Bangalore, Karnataka 560001", photo: "https://images.pexels.com/photos/1187765/pexels-photo-1187765.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Karan Malhotra", email: "student5@qksec.local", phone: "9432109876", class: "5A", address: "12 Marina Beach Road, Chennai, Tamil Nadu 600005", photo: "https://images.pexels.com/photos/1102341/pexels-photo-1102341.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Pooja Shah", email: "student6@qksec.local", phone: "8321098765", class: "5A", address: "8 Sabarmati Society, Ahmedabad, Gujarat 380009", photo: "https://images.pexels.com/photos/712513/pexels-photo-712513.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Vivek Choudhury", email: "student7@qksec.local", phone: "7210987654", class: "5A", address: "19 Cyber City, Gurgaon, Haryana 122002", photo: "https://images.pexels.com/photos/1438081/pexels-photo-1438081.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Anjali Srinivasan", email: "student8@qksec.local", phone: "6109876543", class: "5A", address: "27 Banjara Hills, Hyderabad, Telangana 500034", photo: "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Rohan Bajaj", email: "student9@qksec.local", phone: "9098765432", class: "5A", address: "54 Vaishali Nagar, Jaipur, Rajasthan 302021", photo: "https://images.pexels.com/photos/842980/pexels-photo-842980.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { name: "Meera Kapoor", email: "student10@qksec.local", phone: "8987654321", class: "5A", address: "3 MG Road, Pune, Maharashtra 411001", photo: "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=1200" },
];

const mockParents = [
  { name: "Sanjay Joshi", email: "parent1@qksec.local", students: ["Amit Joshi"], phone: "9876543210", address: "45 Gandhi Road, Mumbai, Maharashtra 400001" },
  { name: "Deepa Menon", email: "parent2@qksec.local", students: ["Sneha Menon"], phone: "8765432109", address: "7 Nehru Nagar, Delhi 110024" },
  { name: "Rajiv Nair", email: "parent3@qksec.local", students: ["Rahul Nair"], phone: "7654321098", address: "22 Tagore Lane, Kolkata, West Bengal 700071" },
  { name: "Priyanka Rao", email: "parent4@qksec.local", students: ["Divya Rao"], phone: "6543210987", address: "33 Cubbon Road, Bangalore, Karnataka 560001" },
  { name: "Arun Malhotra", email: "parent5@qksec.local", students: ["Karan Malhotra"], phone: "9432109876", address: "12 Marina Beach Road, Chennai, Tamil Nadu 600005" },
  { name: "Nitin Shah", email: "parent6@qksec.local", students: ["Pooja Shah"], phone: "8321098765", address: "8 Sabarmati Society, Ahmedabad, Gujarat 380009" },
  { name: "Sunita Choudhury", email: "parent7@qksec.local", students: ["Vivek Choudhury"], phone: "7210987654", address: "19 Cyber City, Gurgaon, Haryana 122002" },
  { name: "Krishna Srinivasan", email: "parent8@qksec.local", students: ["Anjali Srinivasan"], phone: "6109876543", address: "27 Banjara Hills, Hyderabad, Telangana 500034" },
  { name: "Anil Bajaj", email: "parent9@qksec.local", students: ["Rohan Bajaj"], phone: "9098765432", address: "54 Vaishali Nagar, Jaipur, Rajasthan 302021" },
  { name: "Ravi Kapoor", email: "parent10@qksec.local", students: ["Meera Kapoor"], phone: "8987654321", address: "3 MG Road, Pune, Maharashtra 411001" },
];

const mockSubjects = ["Math", "English", "Physics", "Chemistry", "Biology", "History", "Geography", "Art", "Music", "Literature", "Science", "Social Studies"];

const mockClasses = [
  { name: "1A", capacity: 20, grade: 1, supervisor: "Rajesh Sharma" },
  { name: "2B", capacity: 22, grade: 2, supervisor: "Priya Patel" },
  { name: "3C", capacity: 20, grade: 3, supervisor: "Vikram Singh" },
  { name: "4B", capacity: 18, grade: 4, supervisor: "Ananya Reddy" },
  { name: "5A", capacity: 16, grade: 5, supervisor: "Arjun Mehta" },
  { name: "5B", capacity: 20, grade: 5, supervisor: "Kavita Desai" },
  { name: "7A", capacity: 18, grade: 7, supervisor: "Rohit Verma" },
  { name: "6B", capacity: 22, grade: 6, supervisor: "Sunita Iyer" },
  { name: "6C", capacity: 18, grade: 6, supervisor: "Sanjay Kumar" },
  { name: "6D", capacity: 20, grade: 6, supervisor: "Neha Gupta" },
];

const mockLessons = [
  { subject: "Math", class: "1A", teacher: "Rajesh Sharma" },
  { subject: "English", class: "2A", teacher: "Rohit Verma" },
  { subject: "Science", class: "3A", teacher: "Vikram Singh" },
  { subject: "Social Studies", class: "1B", teacher: "Ananya Reddy" },
  { subject: "Art", class: "4A", teacher: "Arjun Mehta" },
  { subject: "Music", class: "5A", teacher: "Arjun Mehta" },
  { subject: "History", class: "6A", teacher: "Ananya Reddy" },
  { subject: "Geography", class: "6B", teacher: "Sanjay Kumar" },
  { subject: "Physics", class: "6C", teacher: "Priya Patel" },
  { subject: "Chemistry", class: "4B", teacher: "Priya Patel" },
];

const mockExams = [
  { subject: "Math", class: "1A", teacher: "Rajesh Sharma", date: "2026-01-18" },
  { subject: "English", class: "2A", teacher: "Rohit Verma", date: "2026-01-14" },
  { subject: "Science", class: "3A", teacher: "Vikram Singh", date: "2026-01-15" },
  { subject: "Social Studies", class: "1B", teacher: "Ananya Reddy", date: "2026-01-17" },
  { subject: "Art", class: "4A", teacher: "Arjun Mehta", date: "2026-01-23" },
  { subject: "Music", class: "5A", teacher: "Arjun Mehta", date: "2026-01-22" },
  { subject: "History", class: "6A", teacher: "Ananya Reddy", date: "2026-01-22" },
  { subject: "Geography", class: "6B", teacher: "Sanjay Kumar", date: "2026-01-21" },
  { subject: "Physics", class: "7A", teacher: "Priya Patel", date: "2026-01-20" },
  { subject: "Chemistry", class: "8A", teacher: "Priya Patel", date: "2026-01-19" },
];

const mockAssignments = [
  { subject: "Math", class: "1A", teacher: "Rajesh Sharma", dueDate: "2026-01-17" },
  { subject: "English", class: "2A", teacher: "Rohit Verma", dueDate: "2026-01-12" },
  { subject: "Science", class: "3A", teacher: "Vikram Singh", dueDate: "2026-01-19" },
  { subject: "Social Studies", class: "1B", teacher: "Ananya Reddy", dueDate: "2026-01-15" },
  { subject: "Art", class: "4A", teacher: "Arjun Mehta", dueDate: "2026-01-18" },
  { subject: "Music", class: "5A", teacher: "Arjun Mehta", dueDate: "2026-01-14" },
  { subject: "History", class: "6A", teacher: "Ananya Reddy", dueDate: "2026-01-16" },
  { subject: "Geography", class: "6B", teacher: "Sanjay Kumar", dueDate: "2026-01-19" },
  { subject: "Physics", class: "7A", teacher: "Priya Patel", dueDate: "2026-01-13" },
  { subject: "Chemistry", class: "8A", teacher: "Priya Patel", dueDate: "2026-01-12" },
];

const mockResults = [
  { student: "Amit Joshi", date: "2026-01-13", score: 90 },
  { student: "Sneha Menon", date: "2026-01-11", score: 90 },
  { student: "Rahul Nair", date: "2026-01-18", score: 90 },
  { student: "Divya Rao", date: "2026-01-17", score: 90 },
  { student: "Karan Malhotra", date: "2026-01-16", score: 90 },
  { student: "Pooja Shah", date: "2026-01-15", score: 90 },
  { student: "Vivek Choudhury", date: "2026-01-14", score: 90 },
  { student: "Anjali Srinivasan", date: "2026-01-13", score: 90 },
  { student: "Rohan Bajaj", date: "2026-01-12", score: 90 },
  { student: "Meera Kapoor", date: "2026-01-11", score: 90 },
];

const mockEvents = [
  { title: "Lake Trip", class: "1A", date: "2026-01-16", startTime: "10:00", endTime: "11:00" },
  { title: "Picnic", class: "2A", date: "2026-01-15", startTime: "10:00", endTime: "11:00" },
  { title: "Beach Trip", class: "3A", date: "2026-01-14", startTime: "10:00", endTime: "11:00" },
  { title: "Museum Trip", class: "4A", date: "2026-01-13", startTime: "10:00", endTime: "11:00" },
  { title: "Music Concert", class: "5A", date: "2026-01-12", startTime: "10:00", endTime: "11:00" },
  { title: "Magician Show", class: "1B", date: "2026-04-10", startTime: "10:00", endTime: "11:00" },
  { title: "Lake Trip 2", class: "2B", date: "2026-04-11", startTime: "10:00", endTime: "11:00" },
  { title: "Cycling Race", class: "3B", date: "2026-01-17", startTime: "10:00", endTime: "11:00" },
  { title: "Art Exhibition", class: "4B", date: "2026-01-18", startTime: "10:00", endTime: "11:00" },
  { title: "Sports Tournament", class: "5B", date: "2026-01-19", startTime: "10:00", endTime: "11:00" },
];

const mockAnnouncements = [
  { title: "About 4A Math Test", class: "4A", date: "2026-01-17" },
  { title: "About 3A Math Test", class: "3A", date: "2026-01-16" },
  { title: "About 3B Math Test", class: "3B", date: "2026-01-15" },
  { title: "About 6A Math Test", class: "6A", date: "2026-01-14" },
  { title: "About 8C Math Test", class: "8C", date: "2026-01-13" },
  { title: "About 2A Math Test", class: "2A", date: "2026-01-14" },
  { title: "About 4C Math Test", class: "4C", date: "2026-01-12" },
  { title: "About 4B Math Test", class: "4B", date: "2026-01-19" },
  { title: "About 3C Math Test", class: "3C", date: "2026-01-15" },
  { title: "About 1C Math Test", class: "1C", date: "2026-01-13" },
];

function splitName(fullName: string) {
  const parts = fullName.split(" ");
  const firstName = parts[0] ?? fullName;
  const lastName = parts.slice(1).join(" ") || firstName;
  return { firstName, lastName };
}

function gradeLevelFromClassName(name: string): number {
  const match = /^(\d+)/.exec(name);
  return match ? Number(match[1]) : 1;
}

async function main() {
  const authCache = new Map<string, string>();

  const academicYear = await requireData(
    await supabaseAdmin
      .from("academic_years")
      .upsert({
        name: "2026-2027",
        starts_on: "2026-04-01",
        ends_on: "2027-03-31",
        is_current: true,
      }, { onConflict: "name" })
      .select("id")
      .single(),
  );

  const gradeByLevel = new Map<number, string>();
  async function getOrCreateGrade(level: number): Promise<string> {
    const cached = gradeByLevel.get(level);
    if (cached) return cached;
    const grade = await requireData(
      await supabaseAdmin.from("grades").upsert({ level }, { onConflict: "level" }).select("id, level").single(),
    );
    gradeByLevel.set(level, grade.id);
    return grade.id;
  }

  const subjectByName = new Map<string, string>();
  async function getOrCreateSubject(name: string): Promise<string> {
    const cached = subjectByName.get(name);
    if (cached) return cached;
    const subject = await requireData(
      await supabaseAdmin.from("subjects").upsert({ name }, { onConflict: "name" }).select("id, name").single(),
    );
    subjectByName.set(name, subject.id);
    return subject.id;
  }
  for (const name of mockSubjects) {
    await getOrCreateSubject(name);
  }

  // ── People ──────────────────────────────────────────────────────────────
  const teacherIdByName = new Map<string, string>();
  const teacherProfileIdByName = new Map<string, string>();
  for (const t of mockTeachers) {
    const { firstName, lastName } = splitName(t.name);
    const profileId = await getOrCreateAuthUser({
      email: t.email, password: validSeedPassword, role: "teacher", firstName, lastName,
    }, authCache);
    await requireData(
      await supabaseAdmin.from("profiles").upsert({
        id: profileId, role: "teacher", first_name: firstName, last_name: lastName,
        phone: t.phone, address: t.address, avatar_path: t.photo,
      }, { onConflict: "id" }).select("id").single(),
    );
    const employeeNumber = `TEA-2026-${String(mockTeachers.indexOf(t) + 1).padStart(3, "0")}`;
    const teacher = await requireData(
      await supabaseAdmin.from("teachers").upsert({
        profile_id: profileId, employee_number: employeeNumber,
      }, { onConflict: "profile_id" }).select("id").single(),
    );
    teacherIdByName.set(t.name, teacher.id);
    teacherProfileIdByName.set(t.name, profileId);
  }

  const classIdByName = new Map<string, string>();
  async function getOrCreateClass(name: string, capacity = 25, supervisorName?: string): Promise<string> {
    const cached = classIdByName.get(name);
    if (cached) return cached;
    const gradeId = await getOrCreateGrade(gradeLevelFromClassName(name));
    const supervisorId = supervisorName ? teacherIdByName.get(supervisorName) ?? null : null;
    const classRecord = await requireData(
      await supabaseAdmin.from("classes").upsert({
        academic_year_id: academicYear.id,
        grade_id: gradeId,
        name,
        capacity,
        supervisor_id: supervisorId,
      }, { onConflict: "academic_year_id,name" }).select("id, name").single(),
    );
    classIdByName.set(name, classRecord.id);
    return classRecord.id;
  }
  for (const c of mockClasses) {
    await getOrCreateClass(c.name, c.capacity, c.supervisor);
  }

  const studentIdByName = new Map<string, string>();
  for (const s of mockStudents) {
    const { firstName, lastName } = splitName(s.name);
    const profileId = await getOrCreateAuthUser({
      email: s.email, password: validSeedPassword, role: "student", firstName, lastName,
    }, authCache);
    await requireData(
      await supabaseAdmin.from("profiles").upsert({
        id: profileId, role: "student", first_name: firstName, last_name: lastName,
        phone: s.phone, address: s.address, avatar_path: s.photo,
      }, { onConflict: "id" }).select("id").single(),
    );
    const classId = await getOrCreateClass(s.class);
    const studentNumber = `STU-2026-${String(mockStudents.indexOf(s) + 1).padStart(3, "0")}`;
    const student = await requireData(
      await supabaseAdmin.from("students").upsert({
        profile_id: profileId, student_number: studentNumber, class_id: classId,
      }, { onConflict: "student_number" }).select("id").single(),
    );
    studentIdByName.set(s.name, student.id);
  }

  const parentIdByName = new Map<string, string>();
  for (const p of mockParents) {
    const { firstName, lastName } = splitName(p.name);
    const profileId = await getOrCreateAuthUser({
      email: p.email, password: validSeedPassword, role: "parent", firstName, lastName,
    }, authCache);
    await requireData(
      await supabaseAdmin.from("profiles").upsert({
        id: profileId, role: "parent", first_name: firstName, last_name: lastName,
        phone: p.phone, address: p.address,
      }, { onConflict: "id" }).select("id").single(),
    );
    const parent = await requireData(
      await supabaseAdmin.from("parents").upsert({ profile_id: profileId }, { onConflict: "profile_id" }).select("id").single(),
    );
    parentIdByName.set(p.name, parent.id);
  }

  // ── Relationships ───────────────────────────────────────────────────────
  const parentStudentWrites = [];
  for (const p of mockParents) {
    const parentId = parentIdByName.get(p.name);
    for (const studentName of p.students) {
      const studentId = studentIdByName.get(studentName);
      if (parentId && studentId) {
        parentStudentWrites.push({ parent_id: parentId, student_id: studentId, relationship: "parent", is_primary: true });
      }
    }
  }
  if (parentStudentWrites.length > 0) {
    await requireData(
      await supabaseAdmin.from("parent_students").upsert(parentStudentWrites, { onConflict: "parent_id,student_id" })
        .select("parent_id").limit(parentStudentWrites.length),
    );
  }

  const teacherSubjectWrites = [];
  const teacherClassWrites = [];
  for (const t of mockTeachers) {
    const teacherId = teacherIdByName.get(t.name);
    if (!teacherId) continue;
    for (const subjectName of t.subjects) {
      const subjectId = await getOrCreateSubject(subjectName);
      teacherSubjectWrites.push({ teacher_id: teacherId, subject_id: subjectId });
    }
    for (const className of t.classes) {
      const classId = await getOrCreateClass(className);
      teacherClassWrites.push({ teacher_id: teacherId, class_id: classId });
    }
  }
  if (teacherSubjectWrites.length > 0) {
    await requireData(
      await supabaseAdmin.from("teacher_subjects").upsert(teacherSubjectWrites, { onConflict: "teacher_id,subject_id" })
        .select("teacher_id").limit(teacherSubjectWrites.length),
    );
  }
  if (teacherClassWrites.length > 0) {
    await requireData(
      await supabaseAdmin.from("teacher_classes").upsert(teacherClassWrites, { onConflict: "teacher_id,class_id" })
        .select("teacher_id").limit(teacherClassWrites.length),
    );
  }

  // ── Lessons ─────────────────────────────────────────────────────────────
  const lessonIdByKey = new Map<string, string>();
  async function getOrCreateLesson(subjectName: string, className: string, teacherName: string, index: number): Promise<string> {
    const key = `${subjectName}|${className}|${teacherName}`;
    const cached = lessonIdByKey.get(key);
    if (cached) return cached;

    const subjectId = await getOrCreateSubject(subjectName);
    const classId = await getOrCreateClass(className);
    const teacherId = teacherIdByName.get(teacherName);
    if (!teacherId) throw new Error(`Unknown teacher for lesson: ${teacherName}`);

    const slot = index % 40;
    const weekday = (slot % 5) + 1;
    const hour = 8 + Math.floor(slot / 5);
    const startTime = `${String(hour).padStart(2, "0")}:00`;
    const endTime = `${String(hour).padStart(2, "0")}:45`;

    const lesson = await requireData(
      await supabaseAdmin.from("lessons").upsert({
        name: subjectName,
        weekday,
        start_time: startTime,
        end_time: endTime,
        subject_id: subjectId,
        class_id: classId,
        teacher_id: teacherId,
      }, { onConflict: "class_id,teacher_id,subject_id,weekday,start_time" }).select("id").single(),
    );
    lessonIdByKey.set(key, lesson.id);
    return lesson.id;
  }
  for (const [index, l] of mockLessons.entries()) {
    await getOrCreateLesson(l.subject, l.class, l.teacher, index);
  }

  const adminProfileId = await getOrCreateAuthUser({
    email: "admin@qksec.local", password: validSeedPassword, role: "admin", firstName: "School", lastName: "Admin",
  }, authCache);
  await requireData(
    await supabaseAdmin.from("profiles").upsert({
      id: adminProfileId, role: "admin", first_name: "School", last_name: "Admin",
    }, { onConflict: "id" }).select("id").single(),
  );

  // ── Exams ───────────────────────────────────────────────────────────────
  const examIds: string[] = [];
  for (const [index, e] of mockExams.entries()) {
    const lessonId = await getOrCreateLesson(e.subject, e.class, e.teacher, 100 + index);
    const createdBy = teacherProfileIdByName.get(e.teacher) ?? adminProfileId;
    const startsAt = `${e.date}T09:00:00Z`;
    // No unique constraint on (lesson_id, starts_at) in the schema, so find-or-insert manually.
    const existing = await supabaseAdmin.from("exams").select("id").eq("lesson_id", lessonId).eq("starts_at", startsAt).maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    const exam = existing.data ?? await requireData(
      await supabaseAdmin.from("exams").insert({
        title: `${e.subject} Exam`,
        starts_at: startsAt,
        ends_at: `${e.date}T10:00:00Z`,
        max_score: 100,
        lesson_id: lessonId,
        created_by: createdBy,
      }).select("id").single(),
    );
    examIds.push(exam.id);
  }

  // ── Assignments ─────────────────────────────────────────────────────────
  for (const [index, a] of mockAssignments.entries()) {
    const lessonId = await getOrCreateLesson(a.subject, a.class, a.teacher, 200 + index);
    const createdBy = teacherProfileIdByName.get(a.teacher) ?? adminProfileId;
    const dueAt = new Date(`${a.dueDate}T23:59:00Z`);
    const startAt = new Date(dueAt.getTime() - 7 * 24 * 60 * 60 * 1000);
    const existing = await supabaseAdmin.from("assignments").select("id").eq("lesson_id", lessonId).eq("due_at", dueAt.toISOString()).maybeSingle();
    if (!existing.data) {
      await requireData(
        await supabaseAdmin.from("assignments").insert({
          title: `${a.subject} Assignment`,
          start_at: startAt.toISOString(),
          due_at: dueAt.toISOString(),
          lesson_id: lessonId,
          created_by: createdBy,
        }).select("id").single(),
      );
    }
  }

  // ── Results (one per exam, index-aligned with mockExams) ───────────────
  function gradeFor(score: number): string {
    if (score >= 90) return "A";
    if (score >= 75) return "B";
    if (score >= 60) return "C";
    return "D";
  }
  for (const [index, r] of mockResults.entries()) {
    const studentId = studentIdByName.get(r.student);
    const examId = examIds[index];
    const exam = mockExams[index];
    if (!studentId || !examId || !exam) continue;
    const createdBy = teacherProfileIdByName.get(exam.teacher) ?? adminProfileId;
    // The uniqueness index on (exam_id, student_id) is partial, which Supabase's onConflict
    // string can't target reliably, so find-or-insert manually instead of upserting.
    const existingResult = await supabaseAdmin.from("results").select("id").eq("exam_id", examId).eq("student_id", studentId).maybeSingle();
    if (existingResult.error) throw new Error(existingResult.error.message);
    if (!existingResult.data) {
      await requireData(
        await supabaseAdmin.from("results").insert({
          student_id: studentId,
          exam_id: examId,
          score: r.score,
          grade: gradeFor(r.score),
          published_at: `${r.date}T12:00:00Z`,
          created_by: createdBy,
        }).select("id").single(),
      );
    }
  }

  // ── Events ──────────────────────────────────────────────────────────────
  for (const [index, e] of mockEvents.entries()) {
    const classId = await getOrCreateClass(e.class);
    const id = `eeeeeee0-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    await requireData(
      await supabaseAdmin.from("events").upsert({
        id,
        title: e.title,
        description: null,
        starts_at: `${e.date}T${e.startTime}:00Z`,
        ends_at: `${e.date}T${e.endTime}:00Z`,
        class_id: classId,
        created_by: adminProfileId,
      }, { onConflict: "id" }).select("id").single(),
    );
  }

  // ── Announcements ───────────────────────────────────────────────────────
  for (const [index, a] of mockAnnouncements.entries()) {
    const classId = await getOrCreateClass(a.class);
    const id = `aaaaaaa0-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    await requireData(
      await supabaseAdmin.from("announcements").upsert({
        id,
        title: a.title,
        body: `Details regarding: ${a.title}.`,
        published_at: `${a.date}T08:00:00Z`,
        published_by: adminProfileId,
      }, { onConflict: "id" }).select("id").single(),
    );
    await requireData(
      await supabaseAdmin.from("announcement_classes").upsert({
        announcement_id: id, class_id: classId,
      }, { onConflict: "announcement_id,class_id" }).select("announcement_id").single(),
    );
  }

  console.log(
    `Seeded ${mockTeachers.length} teachers, ${mockStudents.length} students, ${mockParents.length} parents, ` +
    `${classIdByName.size} classes, ${subjectByName.size} subjects, ${lessonIdByKey.size} lessons, ` +
    `${examIds.length} exams, ${mockAssignments.length} assignments, ${mockResults.length} results, ` +
    `${mockEvents.length} events, ${mockAnnouncements.length} announcements.`,
  );
}

main().catch((error: unknown) => {
  console.error("Database seed failed", error);
  process.exit(1);
});
