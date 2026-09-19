"use client"
import Image from "next/image";
import { useState } from "react";
import EntityForm from "./forms/EntityForm";
import { apiFetch, ApiError } from "@/lib/api";
import { endpointByTable } from "@/lib/entityEndpoints";

const forms:{
  [key:string]:(type:"create" | "update",data?:any, onSuccess?: () => void)=>JSX.Element;
  }={
    teacher: (type , data, onSuccess) => <EntityForm table="teacher" type={type} data={data} onSuccess={onSuccess}/>,
    student: (type , data, onSuccess) => <EntityForm table="student" type={type} data={data} onSuccess={onSuccess}/>,
    parent: (type , data, onSuccess) => <EntityForm table="parent" type={type} data={data} onSuccess={onSuccess}/>,
    assignment: (type, data, onSuccess) => <EntityForm table="assignment" type={type} data={data} onSuccess={onSuccess} />,
    attendance: (type, data, onSuccess) => <EntityForm table="attendance" type={type} data={data} onSuccess={onSuccess} />,
    class: (type, data, onSuccess) => <EntityForm table="class" type={type} data={data} onSuccess={onSuccess} />,
    event: (type, data, onSuccess) => <EntityForm table="event" type={type} data={data} onSuccess={onSuccess} />,
    exam: (type, data, onSuccess) => <EntityForm table="exam" type={type} data={data} onSuccess={onSuccess} />,
    lesson: (type, data, onSuccess) => <EntityForm table="lesson" type={type} data={data} onSuccess={onSuccess} />,
    result: (type, data, onSuccess) => <EntityForm table="result" type={type} data={data} onSuccess={onSuccess} />,
    subject: (type, data, onSuccess) => <EntityForm table="subject" type={type} data={data} onSuccess={onSuccess} />,
    announcement: (type, data, onSuccess) => <EntityForm table="announcement" type={type} data={data} onSuccess={onSuccess} />,
  };

const FormModal = ({table , type , data , id, onSuccess}:{
    table:"teacher" | "student" | "parent"
    |"subject"
    |"class"
    |"exam"
    |"assignment"
    |"result"
    |"lesson"
    |"event"
    |"announcement";
    type:"create"|"update"|"delete";
    data?:any;
    id?:number | string;
    onSuccess?: () => void;

}) => {

    const size = type ==="create"?"w-8 h-8" : "w-7 h-7"
    const bgColor = type === "create" ? "bg-lamaYellow" : type === "update" ? "bg-lamaSky" : "bg-lamaPurple";

   const [open , setOpen] = useState(false);
   const [deleting, setDeleting] = useState(false);
   const [deleteError, setDeleteError] = useState("");
  const selectedForm = forms[table];

  function handleSuccess() {
    setOpen(false);
    onSuccess?.();
  }

  async function handleDelete() {
    setDeleteError("");
    setDeleting(true);
    try {
      const endpoint = endpointByTable[table];
      if (!endpoint) throw new Error("No backend endpoint is configured for this resource.");
      await apiFetch(`/${endpoint}/${id}`, undefined, { method: "DELETE" });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      setDeleteError(error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Unable to delete record.");
    } finally {
      setDeleting(false);
    }
  }

  const Form = () =>{
    return type === "delete"  && id ? (
     <div className="p-4 flex flex-col justify-center align-center gap-4">
      <span className="text center font-medium justify-center text-center"> All data will be lost . are you sure want to delete this {table}?</span>
      {deleteError && <p className="text-sm text-red-500 text-center" role="alert">{deleteError}</p>}
      <button
        type="button"
        disabled={deleting}
        onClick={handleDelete}
        className="bg-red-700 text-white py-2 px-4 rounded-md border-none w-max self-center disabled:opacity-60"
      >
        {deleting ? "Deleting..." : "Delete"}
      </button>
     </div>) :
    (type === "create" || type ==="update") && selectedForm?
     (
    selectedForm(type,data,handleSuccess)
     ):(
    <div className="p-4 text-sm text-gray-600">This form is not implemented yet.</div>
     );
    }


  return (
    <>
    <button className={`${size} flex items-center justify-center rounded-full ${bgColor}`}
    onClick={()=>setOpen(true)}
    >
        <Image src={`/${type}.png`} alt="" width={16} height={16} />
         </button>
         {open && <div className="w-screen h-screen absolute left-0 top-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
         <div className="bg-white p-4 rounded-md relative w-[90%] md:w-[70%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%]">
          <Form />
         <div className="absolute top-4 right-4 cursor-pointer" onClick={()=> setOpen(false)}>
           <Image src="/close.png" alt=""  width={14} height={14} />
            </div>
           </div>
         </div>
          }
    </>
  )
}

export default FormModal
