import { FieldError } from "react-hook-form"

type InputFeildProps = {
    label:string;
    type?:string;
    register:any;
    name:string;
    defaultValue?:string;
    error?:FieldError;
    inputprops?:React.InputHTMLAttributes<HTMLInputElement>;
}
 
 const InputFeild =  ({
    label,
    type="text",
    register,
    name,
    defaultValue,
    error,
    inputprops,
 }:InputFeildProps) => {
   return (
    <div className='flex flex-col gap-2 w-full md:w-1/4'>
    <label className='text-xs text-gray-500'>{label}</label>
<input type={type} {...register(name)}
className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
{...inputprops}
defaultValue={defaultValue}
/>
{error?.message && <p className='text-xs text-red-400'>{error.message.toString()}</p>}
</div>
   )
 }
 

 export default InputFeild 