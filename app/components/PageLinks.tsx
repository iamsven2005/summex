"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { TypedRoomDataWithInfo } from "../utils/liveblocks";
import { usePageLinks } from "../hooks/usePageLinks";

// Infinitely load all pages
export function PageLinks() {
  const pathname = usePathname();
  const [pageOrder, setPageOrder] = useState<string[]>([]);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);

  // Fetch all pages for sidebar
  const { data, error, isLoading, size, setSize, reachedEnd, isLoadingMore, mutate } =
    usePageLinks();

  const allRooms = useMemo(
    () => data?.flatMap((d) => d.rooms) || [],
    [data]
  );

  useEffect(() => {
    if (!allRooms.length) {
      return;
    }

    const stored = typeof window !== "undefined" ? window.localStorage.getItem("page-order") : null;
    const roomIds = allRooms.map((room) => room.id);
    const savedOrder = stored ? JSON.parse(stored) as string[] : [];

    if (!savedOrder?.length) {
      setPageOrder(roomIds);
      window.localStorage.setItem("page-order", JSON.stringify(roomIds));
      return;
    }

    const missingIds = roomIds.filter((id) => !savedOrder.includes(id));
    const filtered = savedOrder.filter((id) => roomIds.includes(id));
    const mergedOrder = [...filtered, ...missingIds];

    if (JSON.stringify(mergedOrder) !== JSON.stringify(savedOrder)) {
      window.localStorage.setItem("page-order", JSON.stringify(mergedOrder));
    }

    setPageOrder(mergedOrder);
  }, [allRooms]);

  const orderedRooms = useMemo(() => {
    if (!pageOrder.length) {
      return allRooms;
    }

    const roomMap = new Map(allRooms.map((room) => [room.id, room]));
    const ordered = pageOrder
      .map((id) => roomMap.get(id))
      .filter((room): room is TypedRoomDataWithInfo => Boolean(room));

    const missing = allRooms.filter((room) => !pageOrder.includes(room.id));
    return [...ordered, ...missing];
  }, [allRooms, pageOrder]);

  const updatePageOrder = (newOrder: string[]) => {
    setPageOrder(newOrder);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("page-order", JSON.stringify(newOrder));
    }
  };

  const handleReorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const current = [...pageOrder];
    const fromIndex = current.indexOf(fromId);
    const toIndex = current.indexOf(toId);
    if (fromIndex === -1 || toIndex === -1) return;

    current.splice(fromIndex, 1);
    current.splice(toIndex, 0, fromId);

    updatePageOrder(current);
  };

  if (error) {
    return <div className="p-2">Error loading pages</div>;
  }

  if (isLoading) {
    const skeletonLength = Array.from({ length: 6 });

    return (
      <div className="flex flex-col gap-px px-5 py-3">
        {skeletonLength.map((_, index) => (
          <div key={index} className="h-8 flex items-center w-full">
            <div className="bg-gray-200/60 h-5 w-40 max-w-full rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data[0].rooms.length === 0) {
    return (
      <div className="px-5 py-3.5 text-sm text-gray-700 font-medium">
        No pages have been created
      </div>
    );
  }

  return (
    <div className="overflow-y-auto p-2 flex flex-col gap-0.5">
      {orderedRooms.map((room) => (
        <PageLink
          key={room.id}
          room={room}
          active={pathname === `/${room.metadata.pageId}`}
          onDelete={() => mutate()}
          draggable
          onDragStart={() => setDraggedPageId(room.id)}
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={() => {
            if (draggedPageId) {
              handleReorder(draggedPageId, room.id);
            }
          }}
        />
      ))}

      {!reachedEnd ? (
        <button
          onClick={() => setSize(size + 1)}
          disabled={isLoadingMore}
          className="text-center py-1.5 px-3 bg-gray-200/60 transition-colors rounded text-medium text-gray-700 hover:text-gray-900 pr-2 text-sm font-medium data-[active]:bg-gray-200/80 data-[active]:text-gray-900 disabled:opacity-70 disabled:aniamte-pulse"
        >
          {isLoadingMore ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}

function PageLink({
  room,
  active,
  onDelete,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  room: TypedRoomDataWithInfo;
  active: boolean;
  onDelete?: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onDrop?: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this page? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      if (onDelete) onDelete();
    } catch (err) {
      console.error("Failed to delete room", err);
      alert("Failed to delete page");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      draggable={draggable}
      onDragStart={(event) => {
        if (onDragStart) onDragStart();
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", room.id);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (onDragOver) onDragOver(event);
      }}
      onDrop={() => {
        if (onDrop) onDrop();
      }}
      data-active={active || undefined}
      className="flex justify-between items-center hover:bg-gray-200/80 transition-colors rounded text-medium text-gray-700 hover:text-gray-900 pr-2 text-sm font-medium data-[active]:bg-gray-200/80 data-[active]:text-gray-900 min-h-8"
    >
      <Link href={room.info.url} className="py-1.5 px-3 flex-1 truncate">
        {room.info.name || (
          <div className="italic font-normal">Empty title</div>
        )}
      </Link>

      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Delete page"
        className="p-2 mr-2 text-sm text-red-500 hover:text-red-700 rounded"
      >
        {deleting ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
