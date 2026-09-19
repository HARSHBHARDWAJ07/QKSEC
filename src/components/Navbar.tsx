"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { useCurrentUser } from "@/lib/useCurrentUser";

const Navbar = () => {
    const router = useRouter();
    const { user, loading } = useCurrentUser();

    function handleSignOut() {
      clearSession();
      router.push("/sign-in");
    }

    const displayName = loading ? "..." : user ? `${user.firstName} ${user.lastName}` : "Not signed in";
    const displayRole = loading ? "" : user ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "";

    return (
      <div className="flex items-center justify-between p-4">
        <div className="hidden md:flex items-center gap-2 gap-2 text-xs rounded-full ring-{1.5px} ring-gray-300 px-2"> 
          <Image src="/search.png" alt="" width={14} height={14}/>
           <input type="text" placeholder="Search..." className="w-[200px] p-2 bg-transparent outline-none"/>
        </div>
        {/* ICONS AND USER */}
        <div className="flex item-center gap-6 justify-end w-full">
        <div className=" bg-white rounded-full w-7 w-7 flex flex items-center justify-center curser-pointer">
          <Image src="/message.png" alt="" width={20} height={20} />  
        </div>
        <div className=" bg-white rounded-full w-7 w-7 flex flex item-center justify-center curser-pointer  relative">
        <Image src="/announcement.png" alt="" width={20} height={20} />
        <div className="absolute -top-3 -right-3 w-3 h-5 flex items-center justify-center bg-purple-500 text-white rounded-full text-xs"> 1 </div>
          </div>
          <div className="flex flex-col">
          <span className="text-xl leading-3 font-medium">{displayName}</span>
          <span className="text-[10px] text-gray-500-right">{displayRole}</span>
          </div>
          <Image src="/avatar.png" alt="" width={36} height={36} className="rounded-full" />
          <button type="button" onClick={handleSignOut} className="text-xs text-gray-500 hover:text-gray-900">
            Sign out
          </button>
        </div>
      </div>
    )
  }
  
  export default Navbar