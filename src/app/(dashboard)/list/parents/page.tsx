"use client";

import { useEffect, useState } from "react";
import ListPage, { Actions, Cell, Chips, useResourceList } from "@/components/ListPage";
import FormModal from "@/components/FormModal";
import { apiFetch, type ParentRecord } from "@/lib/api";
import { personName } from "@/lib/lookups";
import { useCurrentUser } from "@/lib/useCurrentUser";

type ParentStudentLink = {
  students: { id: string; profiles: { first_name: string; last_name: string } | null } | null;
};

const columns = [
  { header: "Parent" },
  { header: "Children", className: "hidden md:table-cell" },
  { header: "Phone", className: "hidden lg:table-cell" },
  { header: "Address", className: "hidden lg:table-cell" },
  { header: "Actions" },
];

const ParentListPage = () => {
  const { role } = useCurrentUser();
  const list = useResourceList<ParentRecord>("/parents");
  const isAdmin = role === "admin";
  const [children, setChildren] = useState<Record<string, string[]>>({});

  // Children aren't included in the parents list response; load them per row.
  useEffect(() => {
    let active = true;
    Promise.all(
      list.records.map((parent) =>
        apiFetch<{ data: ParentStudentLink[] }>(`/parents/${parent.id}/students`)
          .then((response) => [parent.id, response.data.map((link) => personName(link.students?.profiles)).filter((name) => name !== "-")] as const)
          .catch(() => [parent.id, [] as string[]] as const),
      ),
    ).then((entries) => {
      if (active) setChildren(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [list.records]);

  return (
    <ListPage
      title="Parents"
      subtitle="Parents and guardians"
      columns={columns}
      rows={list.records}
      rowKey={(p) => p.id}
      searchText={(p) => `${personName(p.profiles)} ${p.profiles?.phone ?? ""} ${(children[p.id] ?? []).join(" ")}`}
      sortValue={(p) => personName(p.profiles)}
      loading={list.loading}
      error={list.error}
      createTable="parent"
      canCreate={isAdmin}
      onChanged={list.reload}
      renderCells={(p) => (
        <>
          <Cell>
            <p className="font-semibold">{personName(p.profiles, "Unnamed parent")}</p>
            <p className="text-xs text-gray-500 md:hidden">{(children[p.id] ?? []).join(", ")}</p>
          </Cell>
          <Cell className="hidden md:table-cell"><Chips items={children[p.id] ?? []} /></Cell>
          <Cell className="hidden lg:table-cell">{p.profiles?.phone || "-"}</Cell>
          <Cell className="hidden lg:table-cell">{p.profiles?.address || "-"}</Cell>
          <Actions>
            {isAdmin ? (
              <>
                <FormModal table="parent" type="update" data={p} onSuccess={list.reload} />
                <FormModal table="parent" type="delete" id={p.id} onSuccess={list.reload} />
              </>
            ) : <span className="text-gray-400">-</span>}
          </Actions>
        </>
      )}
    />
  );
};

export default ParentListPage;
