import { NextRequest, NextResponse } from "next/server";
import { addUser, getUserByUsername } from "../../../database";

const COLORS = [
  "#D583F0",
  "#F08385",
  "#F0D885",
  "#85EED6",
  "#85BBF0",
  "#8594F0",
  "#85DBF0",
  "#87EE85",
];

function getColorFromName(name: string) {
  const hash = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
}

function createAvatarDataUri(username: string) {
  const initial = username.trim().charAt(0).toUpperCase() || "?";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><rect width='100%' height='100%' fill='white' /><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Inter, system-ui, sans-serif' font-size='64' fill='#111111'>${initial}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { username } = await request.json();
  const trimmedUsername = typeof username === "string" ? username.trim() : "";

  if (!trimmedUsername) {
    return NextResponse.json({ message: "Missing username" }, { status: 400 });
  }

  const normalizedUsername = trimmedUsername.toLowerCase();
  const existingUser = getUserByUsername(normalizedUsername);

  const user =
    existingUser ||
    addUser({
      id: normalizedUsername,
      info: {
        name: trimmedUsername,
        color: getColorFromName(trimmedUsername),
        avatar: createAvatarDataUri(trimmedUsername),
      },
    });

  const response = NextResponse.json({ id: user.id, info: user.info });
  response.cookies.set(
    "doc-session",
    JSON.stringify({ id: user.id, info: user.info }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    }
  );

  return response;
}
