// app/teachers/page.tsx
import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import FormModal from "@/components/FormModal";
import Image from "next/image";
import Table from "@/components/Table";
import { role, teachersData } from "@/lib/data";
import Link from "next/link";

type Teacher = {
  id: number;
  teacherId: string;
  name: string;
  email?: string;
  photo: string;
  phone: string;
  subjects: string[];
  classes: string[];
  address: string;
};

const columns = [
  {
    header: "Teacher Information",
    accessor: "info",
  },
  {
    header: "ID",
    accessor: "teacherID",
    className: "hidden md:table-cell",
  },
  {
    header: "Subjects",
    accessor: "subjects",
    className: "hidden md:table-cell",
  },
  {
    header: "Classes",
    accessor: "classes",
    className: "hidden md:table-cell",
  },
  {
    header: "Contact",
    accessor: "phone",
    className: "hidden lg:table-cell",
  },
  {
    header: "Actions",
    accessor: "action",
  }
];

const TeacherListPage = () => {
  const renderRow = (item: Teacher) => (
    <tr
      key={item.id}
      className="border-b border-lamaSkyLight/30 hover:bg-lamaPurpleLight/10 transition-colors duration-200"
    >
      <td className="p-4">
        <div className="flex items-start gap-4">
          <Image
            src={item.photo}
            alt={item.name}
            width={48}
            height={48}
            className="w-12 h-12 rounded-lg object-cover border-2 border-white shadow-sm"
          />
          <div>
            <h3 className="font-medium text-lamaSky">{item.name}</h3>
            <p className="text-sm text-lamaSky/60">{item.email}</p>
            <div className="md:hidden mt-2">
              <p className="text-xs text-lamaSky/80">ID: {item.teacherId}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {item.subjects.slice(0, 2).map((subject, idx) => (
                  <span
                    key={idx}
                    className="bg-lamaSkyLight/50 text-lamaSky text-xs px-2 py-0.5 rounded-full"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </td>
      <td className="p-4 text-lamaSky/80 hidden md:table-cell">
        {item.teacherId}
      </td>
      <td className="p-4 text-lamaSky/80 hidden md:table-cell">
        <div className="flex flex-wrap gap-1">
          {item.subjects.slice(0, 3).map((subject, idx) => (
            <span
              key={idx}
              className="bg-lamaSkyLight/50 text-lamaSky text-xs px-2 py-0.5 rounded-full"
            >
              {subject}
            </span>
          ))}
          {item.subjects.length > 3 && (
            <span className="bg-lamaSkyLight/50 text-lamaSky text-xs px-2 py-0.5 rounded-full">
              +{item.subjects.length - 3}
            </span>
          )}
        </div>
      </td>
      <td className="p-4 text-lamaSky/80 hidden md:table极">
        <div className="flex flex-wrap gap-1">
          {item.classes.slice(0, 2).map((cls, idx) => (
            <span
              key={idx}
              className="bg-lamaYellowLight/50 text-lamaSky text-xs px-2 py-0.5 rounded-full"
            >
              {cls}
            </span>
          ))}
          {item.classes.length > 2 && (
            <span className="bg-lamaSkyLight/50 text-lamaSky text-xs px-2 py-0.5 rounded-full">
              +{item.classes.length - 2}
            </span>
          )}
        </div>
      </td>
      <td className="p-4 text-lamaSky/80 hidden lg:table-cell">
        {item.phone}
      </td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Link href={`/teachers/${item.id}`} passHref>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-lamaSkyLight shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Image
                src="/view.png"
                alt="View Teacher Details"
                width={16}
                height={16}
                className="opacity-70"
              />
            </button>
          </Link>
          {role === "admin" && (
            <FormModal table="teacher" type="delete" id={item.id} />
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
            Faculty Directory
          </h1>
          <p className="text-lamaSky/60 mt-1">
            Manage and track teacher information
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
                  alt="Add Teacher"
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
          data={teachersData}
        />
      </div>

      {/* PAGINATION */}
      <div className="mt-8">
        <Pagination />
      </div>
    </div>
  );
};

export default TeacherListPage;