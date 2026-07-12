import { openai } from "@ai-sdk/openai";
import { LanguageModel } from "ai";

// Use a vision-capable model for image support
export const aiModel: LanguageModel = openai("gpt-4o");
export const aiVisionModel: LanguageModel = openai("gpt-4o");

export function getRoomId(pageId: string) {
  return `liveblocks:examples:${pageId}`;
}

export function getPageId(roomId: string) {
  return roomId.split(":")[2];
}

export function getPageUrl(roomId: string) {
  return `/${getPageId(roomId)}`;
}
