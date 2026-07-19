"use client";

import {
  RoomProvider,
  useRoomSubscriptionSettings,
} from "@liveblocks/react/suspense";
import { ReactNode, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getRoomId } from "../config";

export function Room({
  pageId,
  children,
}: {
  pageId: string;
  children: ReactNode;
}) {
  const roomId = useExampleRoomId(getRoomId(pageId));

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{}}
      initialStorage={{
        title: "Untitled document",
      }}
    >
      <EnableMentionNotifications />
      {children}
    </RoomProvider>
  );
}

/** Keep inline @mentions enabled for the current user in this document. */
function EnableMentionNotifications() {
  const [{ settings }, updateSettings] = useRoomSubscriptionSettings();

  useEffect(() => {
    if (settings.textMentions !== "mine") {
      updateSettings({ textMentions: "mine" });
    }
  }, [settings.textMentions, updateSettings]);

  return null;
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");
  return exampleId ? `${roomId}-${exampleId}` : roomId;
}
