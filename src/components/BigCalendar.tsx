"use client"

import {Calendar , momentLocalizer,View, Views} from "react-big-calendar"
import moment from 'moment'
import { useEffect, useState } from "react"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { apiFetch } from "@/lib/api"
import type { LessonRecord } from "@/lib/api"

const localizer = momentLocalizer(moment)

type CalendarEvent = {
  title: string;
  allDay: boolean;
  start: Date;
  end: Date;
};

function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function lessonToEvent(lesson: LessonRecord, weekStart: Date): CalendarEvent {
  const dayOffset = lesson.weekday - 1;
  const [startHour, startMinute] = lesson.start_time.split(":").map(Number);
  const [endHour, endMinute] = lesson.end_time.split(":").map(Number);

  const start = new Date(weekStart);
  start.setDate(weekStart.getDate() + dayOffset);
  start.setHours(startHour, startMinute, 0, 0);

  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + dayOffset);
  end.setHours(endHour, endMinute, 0, 0);

  return { title: lesson.subjects?.name ?? lesson.name, allDay: false, start, end };
}

type BigCalendarProps = {
  classId?: string;
  teacherId?: string;
};

const BigCalendar = ({ classId, teacherId }: BigCalendarProps) => {

   const [ view , setView] = useState<View>(Views.WORK_WEEK);
   const [events, setEvents] = useState<CalendarEvent[]>([]);

   const handleOnChangeView = (selectView: View) => {
    setView(selectView);
   }

   useEffect(() => {
     const query = classId ? `?classId=${classId}` : teacherId ? `?teacherId=${teacherId}` : "";
     apiFetch<{ data: LessonRecord[] }>(`/lessons${query}`)
       .then((response) => {
         const weekStart = startOfWeek();
         setEvents(response.data.map((lesson) => lessonToEvent(lesson, weekStart)));
       })
       .catch(() => setEvents([]));
   }, [classId, teacherId]);

  return(

    <Calendar
      localizer={localizer}
      events={events}
      startAccessor="start"
      endAccessor="end"
      views={["work_week","day"]}
      view={view}

      style={{ height: "98%" }}
      onView={handleOnChangeView}
      min={new Date(2025,1,0,8,0,0)}
      max={new Date(2025 ,1,0,17,0,0)}
    />
);
};

export default BigCalendar
