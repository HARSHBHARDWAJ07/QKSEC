"use client"
import Image from "next/image";
import { title } from "process";
import { useState } from "react";
import { useEffect } from "react";
import { apiFetch, EventRecord } from "@/lib/api";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';

type  ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece , ValuePiece ];

  const events =[
    {
        id:1,
        title: "dvd ",
        time:"35",
        description: "hbvjkfbwk" ,
    },
    {
        id:2,
        title: "dvd ",
        time:"35",
        description: "hbvjkfbwk" ,
    },
    {
        id:3,
        title: "dvd ",
        time:"35",
        description: "hbvjkfbwk" ,
    }
  ];


 const EventCalendar = () => {
    const [value , onChange] = useState<Value>(new Date());
    const [liveEvents, setLiveEvents] = useState<EventRecord[]>([]);

    useEffect(() => {
      apiFetch<{ data: EventRecord[] }>("/events")
        .then((response) => setLiveEvents(response.data.slice(0, 3)))
        .catch(() => undefined);
    }, []);

    const displayedEvents = liveEvents.length > 0 ? liveEvents.map((event) => ({
      id: event.id,
      title: event.title,
      time: new Date(event.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      description: event.description ?? "School event",
    })) : events;

  return (
    <div className="bg-white p-4 rounded-md">
        <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold my-4">Events</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
        </div>
       <Calendar  onChange={onChange} value={value} />
       <div className="flex flex-col gap-4">
      {displayedEvents.map(event =>( 
        <div className="p-4 rounded-md border-2 border-gray-100 border-t-4 odd:border-t-lamaSky even:border-t-lamaPurple" key={event.id} > 
        <div className="flex items-center justify-between">
        <h1 className="font-somibold text-gray-600">
            {event.title }
        </h1>
        <span className="text-gray-300 text-xs"> {event.time} </span>
        </div>    
        <p className="mt-2 text-gray-400 text-sm">{event.description}</p>
        </div>
       ))}
       </div>
    </div>
  )
}

export default EventCalendar
