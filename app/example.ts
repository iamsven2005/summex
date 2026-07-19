import { getUser, upsertUser, type UserRecord } from "./database";

export function authWithCurrentUser(endpoint: string) {
  return async (room?: string) => {
    if (typeof window === "undefined") {
      throw new Error("Authentication must happen on the client");
    }

    const stored = window.localStorage.getItem("liveblocks-user");
    if (!stored) {
      throw new Error("Not authenticated");
    }

    const currentUser = JSON.parse(stored);
    if (!currentUser?.userId) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room,
        userId: currentUser.userId,
        name: currentUser.name,
        avatar: currentUser.avatar,
        color: currentUser.color,
      }),
    });

    const text = await response.text();
    if (!text) {
      throw new Error("Empty authentication response from server");
    }

    const payload = JSON.parse(text);
    if (!response.ok) {
      if (response.status === 401) {
        window.localStorage.removeItem("liveblocks-user");
        window.location.assign("/auth");
        throw new Error("User session no longer exists");
      }

      throw new Error(payload?.message || "Liveblocks authentication failed");
    }

    return payload;
  };
}

export async function getSession(request: Request) {
  const { userId } = await request.json();
  let user = getUser(userId);

  if (!user) {
    const cookieSession = getSessionFromCookie(request, userId);
    if (cookieSession) {
      user = upsertUser(cookieSession);
    }
  }

  if (!user) {
    throw Error("User not found");
  }

  return user;
}

export function getSessionFromCookie(
  request: Request,
  expectedUserId?: string
) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const sessionCookie = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("doc-session="));

  if (!sessionCookie) return null;

  try {
    const value = sessionCookie.slice("doc-session=".length);
    const session = JSON.parse(decodeURIComponent(value)) as UserRecord;

    if (
      (expectedUserId && session.id !== expectedUserId) ||
      !session.info?.name ||
      !session.info?.color
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
