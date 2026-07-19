"use client";

import { useChat } from "@ai-sdk/react";
import { createRoomWithLexicalDocument } from "../actions/liveblocks";
import { getPageUrl } from "../config";
import Markdown from "markdown-to-jsx";
import { SparklesIcon } from "../icons/SparklesIcon";
import { UIMessage } from "ai";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { CreateIcon } from "../icons/CreateIcon";
import { ClientSideSuspense } from "@liveblocks/react";
import { StopIcon } from "../icons/StopIcon";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default function Page() {
  return (
    <ClientSideSuspense fallback={null}>
      <Chat />
    </ClientSideSuspense>
  );
}

function Chat() {
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  // Check `app/api/chat/route.ts` for the back-end
  const { messages, sendMessage, status, stop } = useChat();
  
  const isLoading = status === "submitted" || status === "streaming";

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || attachedImage) {
      // Build message content
      const content: any[] = [];
      
      // Add text part if present
      if (input.trim()) {
        content.push({ type: "text", text: input });
      }
      
      // Add image part if present
      if (attachedImage) {
        content.push({
          type: "image",
          image: attachedImage,
        });
      }
      
      // Send message with content array
      sendMessage({
        content: content.length === 1 && content[0].type === "text"
          ? content[0].text
          : content,
      } as any);
      setInput("");
      setAttachedImage(null);
    }
  };

  return (
    <div className="relative w-full mx-auto h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[740px] mx-auto flex-1 px-8 py-4 flex flex-col gap-2">
          {messages.map((message) => (
            <MessageLine key={message.id} message={message} />
          ))}
        </div>
      </div>
      {/* Submit queries to Vercel AI */}
      <form
        onSubmit={handleSubmit}
        className="max-w-[740px] mx-auto w-full flex-0 my-0 relative"
      >
        {messages.length === 0 ? (
          <div className="mx-8 m-4 text-sm">
            Hi there! Try asking me to write a draft. You can also upload an image for analysis.
          </div>
        ) : null}
        <div className="mx-8 m-4 flex flex-col gap-2">
          {/* Image preview */}
          {attachedImage && (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img src={attachedImage} alt="attached" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
          )}
          <div className="relative flex gap-2">
            <label className="p-2 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors" title="Upload image">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={isLoading}
                className="hidden"
              />
              📷
            </label>
            <input
              placeholder={isLoading ? "Generating…" : "Create a draft about…"}
              className="border flex-1 p-2 pl-3 rounded-lg outline-none transition-all focus:outline-indigo-500 disabled:bg-gray-50 disabled:outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              autoFocus={true}
            />
            <button
              type={isLoading ? "button" : "submit"}
              className="p-2 transition-colors rounded-lg border border-transparent hover:border-gray-200 hover:disabled:border-transparent hover:bg-gray-100 hover:disabled:bg-transparent"
              onClick={isLoading ? (e) => { e.preventDefault(); stop?.(); } : undefined}
              disabled={!isLoading && !input && !attachedImage}
            >
              {isLoading ? (
                <StopIcon className="h-4 text-red-500 pointer-events-none" />
              ) : (
                <SparklesIcon
                  style={isLoading || (!input && !attachedImage) ? { opacity: 0.6 } : {}}
                  className="h-4 text-indigo-500 pointer-events-none"
                />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function MessageLine({ message }: { message: UIMessage }) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  // Safely extract parts (some messages may not expose `parts`) and derive text
  const parts: any[] = Array.isArray((message as any).parts)
    ? (message as any).parts
    : Array.isArray((message as any).content)
    ? (message as any).content
    : [];

  // Extract text content from parts
  useEffect(() => {
    const textContent = parts
      .filter((part) => part?.type === "text")
      .map((part) => part.text)
      .join("");

    const match = textContent.match(/^#\s(.+)/);
    if (match) {
      setTitle(match[1]);
      setContent(textContent.replace(/^#\s.+/, "").trim());
    } else {
      setTitle("");
      setContent(textContent);
    }
  }, [JSON.stringify(parts)]);

  // Create new document with content/title and redirect
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setLoading(true);
      const room = await createRoomWithLexicalDocument(
        content,
        title || "Untitled document"
      );
      router.push(getPageUrl(room.id));
    },
    [content, title]
  );

  // Get image content from message parts safely
  const imageContent = parts.filter((part) => part?.type === "image");

  return (
    <div key={message.id}>
      {message.role === "user" ? (
        // Your messages
        <div className="flex justify-end flex-col items-end gap-2">
          {imageContent.length > 0 && (
            <div className="flex gap-2">
              {imageContent.map((part, idx) => (
                <img
                  key={idx}
                  src={part.image || ""}
                  alt="User uploaded"
                  className="rounded-lg max-w-[200px] max-h-[200px] object-cover border border-gray-200"
                />
              ))}
            </div>
          )}
          {content && <div className="bg-gray-100 rounded-full py-1.5 px-3">{content}</div>}
        </div>
      ) : (
        // AI messages
        <div className="flex flex-col gap-2">
          <div className="border rounded-2xl shadow-sm">
            {title ? (
              <div className="font-semibold border-b px-4 py-2 pr-2 text-sm flex justify-start items-center gap-1.5">
                <span>{title}</span>
                <form onSubmit={handleSubmit}>
                  <button
                    disabled={loading}
                    className="font-normal text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:hover:text-gray-500 disabled:hover:bg-transparent transition-colors rounded-lg py-1 px-1.5 flex gap-1 items-center disabled:opacity-70"
                  >
                    <CreateIcon className="w-3 h-3 opacity-70" />
                    {loading ? "Creating…" : "Create"}
                  </button>
                </form>
              </div>
            ) : null}

            {/*Render markdown message as HTML */}
            <div className="px-4">
              <Markdown options={{ forceBlock: true }}>{content}</Markdown>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <button
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 transition-colors rounded-full py-1.5 px-3 flex gap-1.5 items-center disabled:opacity-70 hover:disabled:bg-gray-100"
            >
              <CreateIcon className="w-4 h-4 opacity-70" />
              {loading ? "Creating…" : "Create document"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

