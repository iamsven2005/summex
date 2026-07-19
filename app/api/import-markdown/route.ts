import { NextResponse } from "next/server";
import { createRoomWithLexicalDocument } from "../../actions/liveblocks";
import { getPageUrl } from "../../config";

function extractTitleFromMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)/);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return new NextResponse("No file uploaded", { status: 400 });
  }

  const fileName = file.name.toLowerCase();
  if (
    !fileName.endsWith(".md") &&
    !fileName.endsWith(".markdown") &&
    file.type !== "text/markdown" &&
    file.type !== "text/plain"
  ) {
    return new NextResponse("Only Markdown files are supported.", { status: 400 });
  }

  const markdown = await file.text();
  const title = extractTitleFromMarkdown(markdown) || file.name.replace(/\.[^.]+$/, "");
  const room = await createRoomWithLexicalDocument(markdown, title);

  return NextResponse.json({ url: getPageUrl(room.id) });
}
