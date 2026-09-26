import AdminDashboard from "@/components/AdminDashboard";
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
        QKSEC
       </span>
       </Link>
       <Menu />
        </div>


     <div className="w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%] bg-[#F7F8FA] ">
         <Navbar />
         <div className="min-h-screen bg-lamaSkyLight">
          <AdminDashboard />
        </div>
        </div>
   </div>
  );
};

export default Homepage;
