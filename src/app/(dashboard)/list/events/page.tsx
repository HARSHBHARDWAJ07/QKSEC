import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import Image from "next/image";
import Table from "@/components/Table";
import { eventsData, role } from "@/lib/data";
import Link from "next/link";
import FormModal from "@/components/FormModal";

type Event = {
  id: number;
  title: string;
  class: number;
  date: string;
  startTime: string;
  endTime: string;
};

const columns = [
  {
    header: "Event Title",
    accessor: "title",
  },
  {
    header: "Class",
    accessor: "class",
  },
  {
    header: "Date",
    accessor: "date",
    className: "hidden md:table-cell",
  },
  {
    header: "Start Time",
    accessor: "startTime",
    className: "hidden md:table-cell",
  },
  {
    header: "End Time",
    accessor: "endTime",
    className: "hidden md:table-cell",
  },
  {
    header: "Actions",
    accessor: "action",
  },
];

const EventListPage = () => {
  const renderRow = (item: Event) => (
    <tr
      key={item.id}
      className="border-b border-lamaSkyLight/30 hover:bg-lamaPurpleLight/10 transition-colors duration-200"
    >
      <td className="p-4 text-lamaSky font-medium">{item.title}</td>
      <td className="p-4 text-lamaSky/80">{item.class}</td>
      <td className="p-4 text-lamaSky/70 hidden md:table-cell">{item.date}</td>
      <td className="p-4 text-lamaSky/70 hidden md:table-cell">
        {item.startTime}
      </td>
      <td className="p-4 text-lamaSky/70 hidden md:table-cell">
        {item.endTime}
      </td>
      <td className="p-4">
        <div className="flex items-center gap-3">
            <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-lamaSkyLight shadow-sm hover:shadow-md transition-all duration-200">
                         <Image
                           src="/filter.png"
                           alt="Filter"
                           width={18}
                           height={18}
                           className="opacity-70"
                         />
                       </button>
                       <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-lamaSkyLight shadow-sm hover:shadow-md transition-all duration-200">
                         <Image
                           src="/sort.png"
                           alt="Sort"
                           width={18}
                           height={18}
                           className="opacity-70"
                         />
                       </button>
                       {role === "admin" && (
                         <FormModal table="lesson" type="create" />
                       )}
        
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-lamaSkyLight p-6 rounded-xl max-w-6xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-lamaSky tracking-tight">
            School Events
          </h1>
          <p className="text-lamaSky/60 mt-1">
            View and manage upcoming school events
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <TableSearch />
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-lamaSkyLight shadow-sm hover:shadow-md transition-all duration-200">
              <Image
                src="/filter.png"
                alt="Filter"
                width={18}
                height={18}
                className="opacity-70"
              />
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-lamaSkyLight shadow-sm hover:shadow-md transition-all duration-200">
              <Image
                src="/sort.png"
                alt="Sort"
                width={18}
                height={18}
                className="opacity-70"
              />
            </button>
            {role === "admin" && (
              <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-lamaYellow hover:bg-lamaYellow/90 shadow-sm hover:shadow-md transition-all duration-200">
                <Image
                  src="/plus.png"
                  alt="Add Event"
                  width={18}
                  height={18}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-xl border border-lamaSkyLight/30 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          renderRow={renderRow}
          data={eventsData}
        />
      </div>

      {/* PAGINATION */}
      <div className="mt-8">
        <Pagination />
      </div>
    </div>
  );
};

export default EventListPage;