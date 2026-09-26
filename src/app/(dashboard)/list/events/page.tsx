"use client";

import ListPage, { Actions, Cell, useResourceList } from "@/components/ListPage";
import FormModal from "@/components/FormModal";
import type { EventRecord } from "@/lib/api";
import { formatDate, formatTime, makeResolvers, useLookups } from "@/lib/lookups";
import { useCurrentUser } from "@/lib/useCurrentUser";

const columns = [
  { header: "Event" },
  { header: "Class", className: "hidden md:table-cell" },
  { header: "Date", className: "hidden md:table-cell" },
  { header: "Start", className: "hidden md:table-cell" },
  { header: "End", className: "hidden md:table-cell" },
  { header: "Actions" },
];

const EventListPage = () => {
  const { role } = useCurrentUser();
  const resolve = makeResolvers(useLookups());
  const list = useResourceList<EventRecord>("/events");
  const isAdmin = role === "admin";
  const cls = (e: EventRecord) => (e.class_id ? resolve.className(e.class_id) : "Whole school");

  return (
    <ListPage
      title="Events"
      subtitle="School calendar"
      columns={columns}
      rows={list.records}
      rowKey={(e) => e.id}
      searchText={(e) => `${e.title} ${e.description ?? ""} ${cls(e)}`}
      sortValue={(e) => e.starts_at}
      sortLabel="date"
      loading={list.loading}
      error={list.error}
      createTable="event"
      canCreate={isAdmin}
      onChanged={list.reload}
      renderCells={(e) => (
        <>
          <Cell>
            <p className="font-semibold">{e.title}</p>
            {e.description && <p className="text-xs text-gray-500 line-clamp-1">{e.description}</p>}
            <p className="text-xs text-gray-500 md:hidden">{formatDate(e.starts_at)} · {formatTime(e.starts_at)}</p>
          </Cell>
          <Cell className="hidden md:table-cell">{cls(e)}</Cell>
          <Cell className="hidden md:table-cell whitespace-nowrap">{formatDate(e.starts_at)}</Cell>
          <Cell className="hidden md:table-cell">{formatTime(e.starts_at)}</Cell>
          <Cell className="hidden md:table-cell">{formatTime(e.ends_at)}</Cell>
          <Actions>
            {isAdmin ? (
              <>
                <FormModal table="event" type="update" data={e} onSuccess={list.reload} />
                <FormModal table="event" type="delete" id={e.id} onSuccess={list.reload} />
              </>
            ) : <span className="text-gray-400">-</span>}
          </Actions>
        </>
      )}
    />
  );
};

export default EventListPage;
