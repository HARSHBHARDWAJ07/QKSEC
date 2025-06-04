"use client"
import Image from "next/image" 
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  {
    name: 'Jan',
    income:  4000  ,
    expence:  5000  ,
  },
  {
    name: 'Feb',
    income:  4567  ,
    expence:   9767 ,
  },
  {
    name: 'Mar',
    income:   3355 ,
    expence:  5565  ,
  },
  {
    name: 'Arp',
    income:   4556 ,
    expence:   4644 ,
  },
  {
    name: 'Jun',
    income:   3535 ,
    expence:   5464 ,
  },
  {
    name: 'Jul',
    income:   6565 ,
    expence:   4335 ,
  },
  {
    name: 'Aug',
    income:   4542 ,
    expence:  6465  ,
  },
  {
    name: 'Sept',
    income:   3356 ,
    expence:   7743 ,
  },
  {
    name: 'Oct',
    income:   4647 ,
    expence:  3656  ,
  },
  {
    name: 'nov',
    income:   4466 ,
    expence:    6446,
  },
  {
    name: 'Dec',
    income:   7675 ,
    expence:   4656 ,
  },
];

 const FinancialChart = () => {
  return (
    <div className="bg-white rounded-xl w-full h-full">
        <div className="flex justify-between item-center">
        <h1 className="text-lg font-simibold"> Finance </h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
        </div>
        <ResponsiveContainer width="100%" height="90%">
        <LineChart
          width={500}
          height={300}
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd"  />
          <XAxis dataKey="name"  
          axisLine={false} tick={{fill:"#d1d5db"}} tickLine={false} tickMargin={10}/>
          <YAxis 
          axisLine={false} tick={{fill:"#d1d5db"}} tickLine={false} tickMargin={10} 
          />
          <Tooltip />
          <Legend 
          align="center" verticalAlign="top" wrapperStyle={{paddingTop:"10px" ,paddingBottom:"30px"}} 
          />
          <Line 
          type="monotone" 
          dataKey="income" 
          stroke="#C3EBFA" 
          strokeWidth={5}
          />

<Line 
          type="monotone" 
          dataKey="expence" 
          stroke="#CFCEFF" 
          strokeWidth={5}
          />

        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default FinancialChart