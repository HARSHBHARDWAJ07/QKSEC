// app/teachers/[id]/page.tsx
import Announcements from "@/components/Announcements";
import BigCalendar from "@/components/BigCalendar";
import Image from "next/image";
import Link from "next/link";
import Performance from "@/components/Performance";
import FormModal from "@/components/FormModal";
import { teachersData } from "@/lib/data"; 

export async function generateStaticParams() {
  return teachersData.map(teacher => ({
    id: teacher.id.toString(),
  }));
}

type Teacher = {
  id: number;
  teacherId: string;
  name: string;
  email?: string;
  photo: string;
  phone: string;
  subjects: string[];
  classes: string[];
  address: string;
};

const SingleTeacherPage = ({ params }: { params: { id: string } }) => {
  const teacher = teachersData.find(t => t.id.toString() === params.id);
  
  if (!teacher) {
    return (
      <div className="bg-lamaSkyLight min-h-screen p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-lamaSky mb-4">Teacher Not Found</h1>
          <p className="text-lg text-lamaSky/70 mb-6">
            The requested teacher does not exist in our records
          </p>
          <Link 
            href="/teachers" 
            className="inline-block px-6 py-3 bg-lamaPurple text-white rounded-lg hover:bg-lamaPurpleDark transition-colors"
          >
            Back to Teachers List
          </Link>
        </div>
      </div>
    );
  }

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
                  src={teacher.photo}
                  alt={teacher.name}
                  width={144}
                  height={144}
                  className="w-32 h-32 rounded-full object-cover border-4 border-lamaSkyLight"
                />
                <div className="absolute bottom-2 right-2 bg-lamaYellow rounded-full w-8 h-8 flex items-center justify-center shadow-md">
                  <span className="text-xs font-bold text-white">A+</span>
                </div>
              </div>
            </div>
            
            {/* USER INFO */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-lamaSky">{teacher.name}</h1>
                  <p className="text-lamaSky/70 mt-1">
                    {teacher.subjects.join(' & ')} • {teacher.classes.length} Classes
                  </p>
                </div>
                <div className="flex gap-3">
                  <FormModal table="teacher" type="update" id={teacher.id} />
                  <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-lamaSkyLight border border-lamaSkyLight/30 shadow-sm hover:shadow-md transition-all duration-200">
                    <Image
                      src="/share.png"
                      alt="Share profile"
                      width={18}
                      height={18}
                      className="opacity-70"
                    />
                  </button>
                </div>
              </div>
              
              <p className="text-lamaSky/80 mb-6">
                Dedicated educator with expertise in {teacher.subjects.join(' and ')}. 
                Passionate about innovative teaching methods and student success.
              </p>
              
              {/* CONTACT INFO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-lamaSkyLight flex items-center justify-center">
                    <Image
                      src="/mail.png"
                      alt="Email"
                      width={16}
                      height={16}
                      className="opacity-70"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-lamaSky/60">Email</p>
                    <p className="text-lamaSky font-medium">{teacher.email || "N/A"}</p>
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
                    <p className="text-lamaSky font-medium">{teacher.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-lamaSkyLight flex items-center justify-center">
                    <Image
                      src="/date.png"
                      alt="Join Date"
                      width={16}
                      height={16}
                      className="opacity-70"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-lamaSky/60">Teacher ID</p>
                    <p className="text-lamaSky font-medium">{teacher.teacherId}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-lamaSkyLight flex items-center justify-center">
                    <Image
                      src="/location.png"
                      alt="Address"
                      width={16}
                      height={16}
                      className="opacity-70"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-lamaSky/60">Address</p>
                    <p className="text-lamaSky font-medium">{teacher.address}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-lamaSkyLight/30 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-lamaSkyLight flex items-center justify-center">
                  <Image
                    src="/singleAttendance.png"
                    alt="Attendance"
                    width={24}
                    height={24}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-lamaSky">96%</h2>
                  <p className="text-sm text-lamaSky/60">Attendance</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-5 shadow-sm border border-lamaSkyLight/30 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-lamaPurpleLight flex items-center justify-center">
                  <Image
                    src="/singleBranch.png"
                    alt="Departments"
                    width={24}
                    height={24}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-lamaSky">{teacher.subjects.length}</h2>
                  <p className="text-sm text-lamaSky/60">Subjects</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-5 shadow-sm border border-lamaSkyLight/30 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-lamaYellowLight flex items-center justify-center">
                  <Image
                    src="/singleLesson.png"
                    alt="Lessons"
                    width={24}
                    height={24}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-lamaSky">18</h2>
                  <p className="text-sm text-lamaSky/60">Lessons</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-5 shadow-sm border border-lamaSkyLight/30 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-pink-50 flex items-center justify-center">
                  <Image
                    src="/singleClass.png"
                    alt="Classes"
                    width={24}
                    height={24}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-lamaSky">{teacher.classes.length}</h2>
                  <p className="text-sm text-lamaSky/60">Classes</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* CALENDAR SECTION */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-lamaSky">Teaching Schedule</h2>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-sm rounded-lg bg-lamaSkyLight text-lamaSky hover:bg-lamaSkyLight/80 transition-colors">
                  Today
                </button>
                <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-lamaSkyLight border border-lamaSkyLight/30 shadow-sm hover:shadow-md transition-all duration-200">
                  <Image
                    src="/filter.png"
                    alt="Filter"
                    width={18}
                    height={18}
                    className="opacity-70"
                  />
                </button>
              </div>
            </div>
            <div className="h-[500px]">
              <BigCalendar />
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
                href={`/teachers/${teacher.id}/classes`}
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
                href={`/teachers/${teacher.id}/students`}
                className="p-4 rounded-xl bg-lamaPurpleLight flex flex-col items-center justify-center text-center hover:bg-lamaPurpleLight/80 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center mb-2 group-hover:bg-lamaPurpleLight transition-colors">
                  <Image
                    src="/students.png"
                    alt="Students"
                    width={24}
                    height={24}
                  />
                </div>
                <span className="text-lamaSky font-medium">Students</span>
              </Link>
              
              <Link 
                href={`/teachers/${teacher.id}/lessons`}
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
                href={`/teachers/${teacher.id}/exams`}
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
          <Performance />
          
          {/* ANNOUNCEMENTS */}
          <Announcements />
        </div>
      </div>
    </div>
  );
};

export default SingleTeacherPage;