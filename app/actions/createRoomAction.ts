"use server";

import { redirect } from "next/navigation";
import { createRoom } from "../utils/liveblocks";
import { getPageUrl } from "../config";

export async function createRoomAction() {
  const room = await createRoom();
  redirect(getPageUrl(room.id));
}
