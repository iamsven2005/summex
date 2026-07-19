import { NextRequest, NextResponse } from "next/server";
import { getUsers, upsertUser } from "../../../database";
import { getSessionFromCookie } from "../../../example";

/**
 * Returns a list of user IDs from a partial search input
 * For `resolveMentionSuggestions` in liveblocks.config.ts
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text") ?? "";

  // This route may be initialized separately from the auth route. Seed its
  // user registry from the valid browser session before resolving mentions.
  const currentUser = getSessionFromCookie(request);
  if (currentUser) {
    upsertUser(currentUser);
  }

  const filteredUserIds = getUsers()
    .filter((user) => {
      return user.info.name.toLowerCase().includes(text.toLowerCase());
    })
    .map((user) => user.id);

  return NextResponse.json(filteredUserIds);
}
