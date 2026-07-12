import { NextResponse } from "next/server";
import { deleteRoom } from "../../../utils/liveblocks";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  try {
    await deleteRoom(roomId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/rooms/:roomId failed", err);
    return new NextResponse(err?.message || "Failed to delete room", { status: 500 });
  }
}
