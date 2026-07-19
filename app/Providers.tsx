"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { ReactNode, Suspense, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authWithCurrentUser } from "./example";
import { getRoomInfo } from "./actions/liveblocks";

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(pathname === "/auth");

  useEffect(() => {
    if (pathname === "/auth") {
      setAuthenticated(true);
      return;
    }

    const stored = window.localStorage.getItem("liveblocks-user");

    if (!stored) {
      router.replace("/auth");
      return;
    }

    try {
      const currentUser = JSON.parse(stored);
      if (!currentUser?.userId) {
        router.replace("/auth");
        return;
      }

      setAuthenticated(true);
    } catch (error) {
      router.replace("/auth");
    }
  }, [pathname, router]);

  if (!authenticated) {
    return null;
  }

  if (pathname === "/auth") {
    return <>{children}</>;
  }

  return (
    <LiveblocksProvider
      authEndpoint={authWithCurrentUser("/api/liveblocks-auth")}
      // Get users' info from their ID
      resolveUsers={async ({ userIds }) => {
        const searchParams = new URLSearchParams(
          userIds.map((userId) => ["userIds", userId])
        );
        const response = await fetch(`/api/users?${searchParams}`);

        if (!response.ok) {
          throw new Error("Problem resolving users");
        }

        const users = await response.json();
        return users;
      }}
      // Find a list of users that match the current search term
      resolveMentionSuggestions={async ({ text }) => {
        const response = await fetch(
          `/api/users/search?text=${encodeURIComponent(text)}`
        );

        if (!response.ok) {
          throw new Error("Problem resolving mention suggestions");
        }

        const userIds = await response.json();
        return userIds;
      }}
      resolveRoomsInfo={async ({ roomIds }) => {
        const info = await getRoomInfo(roomIds);
        return info;
      }}
    >
      <Suspense>{children}</Suspense>
    </LiveblocksProvider>
  );
}
