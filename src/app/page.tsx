import Announcements from "@/components/Announcements";
import AttendenceChart from "@/components/AttendenceChart";
import CounterChart from "@/components/CounterChart";
import EventCalendar from "@/components/EventCalendar";
import FinancialChart from "@/components/FinancialChart";
import UserCard from "@/components/UserCard";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import Menu from "@/components/Menu";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const Homepage = ({}: PageProps) => {  
  return (
    
        <div className="h-screen flex">

    <div className="w-[14%] md:w-[8%] lg:w-[16%] xl:w-[14%] p-4">
       <Link href="/" className="flex items-centre justify-center lg:justify-start gap-2">
       <Image src="/logo.png" alt="logo" width={32} height={32} />
       <span className=" hidden lg:block font-bold">
        Bat app
       </span>
       </Link>
       <Menu />
        </div>


     <div className="w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%] bg-[#F7F8FA] ">
         <Navbar />
         <div className="min-h-screen bg-lamaSkyLight p-6">
      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* User Cards Section */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-4 md:grid-cols-4">
          <UserCard type="admin" />
          <UserCard type="teacher" />
          <UserCard type="student" />
          <UserCard type="parent" />
        </div>
        
        {/* Charts Section */}
        <div className="lg:col-span-3 grid grid-cols-1 gap-6">
          {/* Top Charts Row */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-5 transition-all duration-300 hover:shadow-md h-full">
                <CounterChart />
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-5 transition-all duration-300 hover:shadow-md h-full">
                <AttendenceChart />
              </div>
            </div>
          </div>
          
          {/* Finance Chart */}
          <div>
            <div className="bg-white rounded-xl shadow-sm p-5 transition-all duration-300 hover:shadow-md h-[500px]">
              <FinancialChart />
            </div>
          </div>
        </div>
        
        {/* Sidebar Section */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-sm p-5 transition-all duration-300 hover:shadow-md">
            <EventCalendar  />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 transition-all duration-300 hover:shadow-md">
            <Announcements />
          </div>
        </div>
      </div>
    </div>
        </div>
   </div>
  );
};

export default Homepage;