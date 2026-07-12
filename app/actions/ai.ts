"use server";

import { createStreamableValue } from "@ai-sdk/rsc";
import { ModelMessage, streamText } from "ai";
import { aiVisionModel } from "../config";

// Send messages to AI and stream a result back
// Supports text and image content
export async function continueConversation(messages: ModelMessage[]) {
  const result = await streamText({
    model: aiVisionModel,
    messages,
    system: "You are a helpful AI assistant. You can analyze images and text content. Provide clear and concise responses.",
  });

  const stream = createStreamableValue(result.textStream);
  return stream.value;
}
