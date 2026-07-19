import { Liveblocks } from "@liveblocks/node";
import { NextRequest } from "next/server";
import { getSession } from "../../example";

// Authenticating your Liveblocks application
// https://liveblocks.io/docs/authentication

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.LIVEBLOCKS_SECRET_KEY) {
      throw new Error("Missing LIVEBLOCKS_SECRET_KEY");
    }

    const user = await getSession(request);

    const session = liveblocks.prepareSession(`${user.id}`, {
      userInfo: user.info,
    });

    session.allow(`liveblocks:examples:*`, ["*:write"]);

    const { body, status } = await session.authorize();
    return new Response(body, { status, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Liveblocks auth failed", error);
    const message = error instanceof Error ? error.message : "Unknown auth error";
    const status = message === "User not found" ? 401 : 500;
    const response = new Response(JSON.stringify({ message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
    if (status === 401) {
      response.headers.append(
        "Set-Cookie",
        "doc-session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
      );
    }
    return response;
  }
}
