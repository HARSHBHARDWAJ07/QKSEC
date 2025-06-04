import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import FormModal from "@/components/FormModal";
import Image from "next/image";
import Table from "@/components/Table";
import { parentsData, role } from "@/lib/data";
import Link from "next/link";

type Parent = {
  id: number;
  name: string;
  email?: string;
  students: string[];
  phone?: string;
  address: string;
};

const columns = [
  {
    header: "Parent Information",
    accessor: "info",
  },
  {
    header: "Students",
    accessor: "students",
    className: "hidden md:table-cell",
  },
  {
    header: "Contact",
    accessor: "phone",
    className: "hidden lg:table-cell",
  },
  {
    header: "Address",
    accessor: "address",
    className: "hidden lg:table-cell",
  },
  {
    header: "Actions",
    accessor: "action",
  },
];

const ParentListPage = () => {
  const renderRow = (item: Parent) => (
    <tr
      key={item.id}
      className="border-b border-lamaSkyLight/30 hover:bg-lamaPurpleLight/10 transition-colors duration-200"
    >
      <td className="p-4">
        <div className="flex items-start gap-3">
          <div className="bg-lamaSkyLight/50 rounded-full w-10 h-10 flex items-center justify-center">
            <span className="text-lamaSky font-medium">
              {item.name.charAt(0)}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-lamaSky">{item.name}</h3>
            <p className="text-sm text-lamaSky/60">{item.email}</p>
          </div>
        </div>
      </td>
      <td className="p-4 text-lamaSky/80 hidden md:table-cell">
        <div className="flex flex-wrap gap-1">
          {item.students.map((student, idx) => (
            <span
              key={idx}
              className="bg-lamaSkyLight/50 text-lamaSky text-xs px-2 py-1 rounded-full"
            >
              {student}
            </span>
          ))}
        </div>
      </td>
      <td className="p-4 text-lamaSky/80 hidden lg:table-cell">
        {item.phone}
      </td>
      <td className="p-4 text-lamaSky/80 hidden lg:table-cell">
        {item.address}
      </td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Link href={`/list/parents/${item.id}`} passHref>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-lamaSkyLight shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Image
                src="/edit.png"
                alt="Edit Parent"
                width={16}
                height={16}
                className="opacity-70"
              />
            </button>
          </Link>
          {role === "admin" && (
            <>
              <FormModal table="parent" type="update" data={item} />
              <FormModal table="parent" type="delete" id={item.id} />
            </>
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
            Parent Directory
          </h1>
          <p className="text-lamaSky/60 mt-1">
            Manage parent information and connections
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
              <FormModal table="parent" type="create" />
            )}
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-xl border border-lamaSkyLight/30 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          renderRow={renderRow}
          data={parentsData}
        />
      </div>

      {/* PAGINATION */}
      <div className="mt-8">
        <Pagination />
      </div>
    </div>
  );
};

export default ParentListPage;