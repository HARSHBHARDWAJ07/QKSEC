"use client";

import ListPage, { Actions, Cell, Chips, useResourceList } from "@/components/ListPage";
import FormModal from "@/components/FormModal";
import type { AnnouncementRecord } from "@/lib/api";
import { formatDate, makeResolvers, useLookups } from "@/lib/lookups";
import { useCurrentUser } from "@/lib/useCurrentUser";

type Announcement = AnnouncementRecord & {
  announcement_classes?: { class_id?: string; classes?: { name: string } | null }[];
};

const columns = [
  { header: "Announcement" },
  { header: "Audience", className: "hidden md:table-cell" },
  { header: "Published", className: "hidden md:table-cell" },
  { header: "Expires", className: "hidden lg:table-cell" },
  { header: "Actions" },
];

const AnnouncementListPage = () => {
  const { role } = useCurrentUser();
  const resolve = makeResolvers(useLookups());
  const list = useResourceList<Announcement>("/announcements");
  const isAdmin = role === "admin";
  const audience = (a: Announcement) => {
    const names = (a.announcement_classes ?? []).map((link) => link.classes?.name ?? resolve.className(link.class_id));
    return names.length ? names : ["Everyone"];
  };

  return (
    <ListPage
      title="Announcements"
      subtitle="Notices for staff, students and parents"
      columns={columns}
      rows={list.records}
      rowKey={(a) => a.id}
      searchText={(a) => `${a.title} ${a.body} ${audience(a).join(" ")}`}
      sortValue={(a) => a.published_at ?? ""}
      sortLabel="publish date"
      loading={list.loading}
      error={list.error}
      page={list.page}
      totalPages={list.meta?.totalPages ?? 1}
      onPageChange={list.setPage}
      createTable="announcement"
      canCreate={isAdmin}
      onChanged={list.reload}
      renderCells={(a) => (
        <>
          <Cell>
            <p className="font-semibold">{a.title}</p>
            <p className="text-xs text-gray-500 line-clamp-2 max-w-md">{a.body}</p>
          </Cell>
          <Cell className="hidden md:table-cell"><Chips items={audience(a)} /></Cell>
          <Cell className="hidden md:table-cell whitespace-nowrap">{a.published_at ? formatDate(a.published_at) : <span className="text-gray-400">Draft</span>}</Cell>
          <Cell className="hidden lg:table-cell whitespace-nowrap">{formatDate(a.expires_at)}</Cell>
          <Actions>
            {isAdmin ? (
              <>
                <FormModal table="announcement" type="update" data={a} onSuccess={list.reload} />
                <FormModal table="announcement" type="delete" id={a.id} onSuccess={list.reload} />
              </>
            ) : <span className="text-gray-400">-</span>}
          </Actions>
        </>
      )}
    />
  );
};

export default AnnouncementListPage;
