"use client"
import { zodResolver } from '@hookform/resolvers/zod';
import {useForm } from "react-hook-form"
import { z } from "zod";
import InputFeild from '../InputFeild';
import Image from 'next/image';


const schema = z.object({
    username: z
    .string()
    .min(3 ,{message:"Username must be at least 3 charater long!"})
    .max(20 ,{message:"Username must be at most 20 charater long!"}),
    email :z.string().email({message:"Invalid email address!"}),
    password:z
      .string()
      .min(8, {message:"Password must be at least 8 character long!"}),
    firstName:z.string().min(1, {message:"First name is required!"}),
    lastName:z.string().min(1, {message:"last name is required!"}),
    phone:z.string().min(1, {message:"Phone Number is required!"}),
    address:z.string().min(1, {message:"Address is required!"}),
    bloodType:z.string().min(1, {message:"Blood Type is required!"}),
    birthday:z.string().min(1, {message:"Birthday is required!"}),
    sex: z.enum(["male","female"],{message:"Sex is required!"}),
    img:z.instanceof(File,{message:"Image is required"})
});

type Inputs =z.infer<typeof schema>

const TeacherForm = ({
    type ,
    data ,
}:{type:"create" | "update" ; data?:any; }) => {

   const {
    register,
    handleSubmit,
    formState:{errors},
   } = useForm<Inputs>({
    resolver:zodResolver(schema),
   });

   const onSubmit = handleSubmit(data=>{
    console.log(data);
   });

    return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
     <h1 className="text-xl font-semibold"> Create a new teacher  </h1>
    <span className="text-xs text-gray font-medium">
         Authentication Infrmation 
         </span>
         <div className='flex justify-between flex-wrap gap-4'>
        <InputFeild 
        label="username" 
        name="username"
        defaultValue={data?.username} 
        register={register} 
        error={errors.username}/>
        <InputFeild 
        label="Email" 
        name="email"
        type="email"
        defaultValue={data?.email} 
        register={register} 
        error={errors.email}/>
        <InputFeild 
        label="Password" 
        name="password"
        type="password"
        defaultValue={data?.password} 
        register={register} 
        error={errors.password}/>
        
</div>
    <span className="text-xs text-gray font-medium"> Personal Information </span>
    <div className='flex justify-between flex-wrap gap-4'>
    <InputFeild 
        label="First Name" 
        name="firstName"
        defaultValue={data?.firstName} 
        register={register} 
        error={errors.firstName}/>
    <InputFeild 
        label="Last name" 
        name="lastName"
        defaultValue={data?.lastName} 
        register={register} 
        error={errors.lastName}/>
        <InputFeild 
        label="Phone" 
        name="phone"
        defaultValue={data?.phone} 
        register={register} 
        error={errors.phone}/>
        <InputFeild 
        label="Address" 
        name="address"
        defaultValue={data?.address} 
        register={register} 
        error={errors.address}/>
        <InputFeild 
        label="Blood Type" 
        name="bloodType"
        defaultValue={data?.bloodType} 
        register={register} 
        error={errors.bloodType}/>
        <InputFeild 
        label="Birthday" 
        name="birthday"
        type="date"
        defaultValue={data?.birthday} 
        register={register} 
        error={errors.birthday}/>
      

        <div className='flex flex-col gap-2 w-full md:w-1/4'>
    <label className='text-xs text-gray-500'>Sex</label>
  <select className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full" {...register("sex")} defaultValue={data?.sex}>
  <option value="male"> Male </option>
  <option value="female"> Female </option>
  </select>
{errors.sex?.message && <p className='text-xs text-red-400'>{errors.sex.message.toString()}</p>}
</div>
<div className='flex flex-col gap-2 w-full md:w-1/4 justify-center'>
    <label className='text-xs text-gray-500 flex items-center gap-2 curser-pointer' htmlFor='img'>
        <Image  src="/upload.png" alt='' width={28} height={28} />
        <span> Upload a photo</span>
    </label>
 <input 
 id="img"
 className='hidden'
 type='file'
 {...register("img")}
 />
 {errors.img?.message && <p className='text-xs text-red-400'>{errors.img.message.toString()}</p>}


</div>
</div>
    <button className='bg-blue-400 text-white p-4 rounded-md'> 
        {type === "create"?"Create":"Update"}
    </button>
    </form>
    )
}  
 
export default TeacherForm;