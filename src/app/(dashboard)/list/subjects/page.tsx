"use client";

import ListPage, { Actions, Cell, Chips, useResourceList } from "@/components/ListPage";
import FormModal from "@/components/FormModal";
import type { SubjectRecord } from "@/lib/api";
import { makeResolvers, useLookups } from "@/lib/lookups";
import { useCurrentUser } from "@/lib/useCurrentUser";

const columns = [
  { header: "Subject" },
  { header: "Teachers", className: "hidden md:table-cell" },
  { header: "Actions" },
];

const SubjectListPage = () => {
  const { role } = useCurrentUser();
  const resolve = makeResolvers(useLookups());
  const list = useResourceList<SubjectRecord>("/subjects");
  const isAdmin = role === "admin";

  return (
    <ListPage
      title="Subjects"
      subtitle="Curriculum subjects and the teachers who teach them"
      columns={columns}
      rows={list.records}
      rowKey={(s) => s.id}
      searchText={(s) => `${s.name} ${resolve.subjectTeachers(s.id).join(" ")}`}
      sortValue={(s) => s.name}
      loading={list.loading}
      error={list.error}
      createTable="subject"
      canCreate={isAdmin}
      onChanged={list.reload}
      renderCells={(s) => (
        <>
          <Cell>
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-lamaYellowLight text-lamaSky font-bold flex items-center justify-center">{s.name.charAt(0)}</span>
              <span className="font-semibold">{s.name}</span>
            </div>
          </Cell>
          <Cell className="hidden md:table-cell"><Chips items={resolve.subjectTeachers(s.id)} max={4} /></Cell>
          <Actions>
            {isAdmin ? (
              <>
                <FormModal table="subject" type="update" data={s} onSuccess={list.reload} />
                <FormModal table="subject" type="delete" id={s.id} onSuccess={list.reload} />
              </>
            ) : <span className="text-gray-400">-</span>}
          </Actions>
        </>
      )}
    />
  );
};

export default SubjectListPage;
