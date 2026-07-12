import { convertToModelMessages, streamText } from "ai";
import { aiModel } from "../../config";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Normalize incoming messages so convertToModelMessages receives a stable shape.
  // convertToModelMessages expects each message to have a `content` field; some
  // clients may send `parts` or a plain string. We normalize to `content` being
  // either a string or an array of `{ type, ... }` parts.
  const processedMessages = (Array.isArray(messages) ? messages : []).map(
    (raw: any) => {
      const msg: any = { ...(raw || {}) };

      // If `content` is missing, try common fallbacks
      if (msg.content === undefined) {
        if (msg.parts !== undefined) msg.content = msg.parts;
        else if (typeof msg.text === "string") msg.content = msg.text;
        else if (typeof msg.body === "string") msg.content = msg.body;
        else msg.content = "";
      }

      // If content is an array, ensure image parts are explicit
      if (Array.isArray(msg.content)) {
        msg.content = msg.content.map((part: any) => {
          if (!part) return part;
          if (part.type === "image" && part.image) {
            // keep image data as-is (data URL or base64)
            return { type: "image", image: part.image };
          }
          if (part.type === "text" || typeof part === "string") {
            return typeof part === "string" ? { type: "text", text: part } : part;
          }
          return part;
        });
      }

      // If content is something else (object/string), leave it be
      return msg;
    }
  );

  // Build modelMessages in the shape the `ai` SDK expects to avoid
  // depending on convertToModelMessages which may be brittle across versions.
  const modelMessages = processedMessages.map((m: any) => {
    const role = m.role || "user";

    let contentParts: any[] = [];
    if (Array.isArray(m.content)) {
      contentParts = m.content.map((p: any) => {
        if (!p) return { type: "text", text: "" };
        if (p.type === "image") return { type: "image", image: p.image };
        if (p.type === "text") return { type: "text", text: String(p.text || "") };
        // If it's a raw string
        if (typeof p === "string") return { type: "text", text: p };
        return { type: "text", text: String(p?.text ?? "") };
      });
    } else if (typeof m.content === "string") {
      contentParts = [{ type: "text", text: m.content }];
    } else if (m.content && typeof m.content === "object") {
      // If content is an object with text
      contentParts = [{ type: "text", text: String(m.content.text || "") }];
    } else {
      contentParts = [{ type: "text", text: "" }];
    }

    return { role, content: contentParts };
  });

  const result = streamText({
    model: aiModel,
    system:
      "You generate markdown documents for users. Unless specified, this is a draft. Keep things shortish. Do not add any supplementary text, as everything you say will be placed into a document. If you're confused however, it's okay to ask a user for info. Responses must be either a chat response, or a document. Don't add bold styling to headings. When analyzing images, provide detailed descriptions and relevant insights based on the image content.",
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
