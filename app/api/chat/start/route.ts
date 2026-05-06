import { NextRequest, NextResponse } from "next/server";
import { getLoggedInUser } from "@/lib/appwrite";
import {
  createDistinctGroupChannel,
  ensureSendbirdUser,
} from "@/lib/sendbird-server";

export async function POST(req: NextRequest) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const shopOwnerUserId = String(body.shopOwnerUserId ?? "").trim();
    const shopName = String(body.shopName ?? "").trim();
    const displayTitle = String(body.displayTitle ?? "").trim();

    if (!shopOwnerUserId || !shopName || !displayTitle) {
      return NextResponse.json(
        { error: "Missing seller or listing information" },
        { status: 400 }
      );
    }

    if (shopOwnerUserId === user.$id) {
      return NextResponse.json(
        { error: "You cannot start a chat with your own shop" },
        { status: 400 }
      );
    }

    const buyerName =
      user.name?.trim() ||
      (typeof user.email === "string" ? user.email : "") ||
      "Buyer";

    await Promise.all([
      ensureSendbirdUser(user.$id, buyerName),
      ensureSendbirdUser(shopOwnerUserId, shopName),
    ]);

    const channelName = `${shopName} — ${displayTitle}`;
    const channel = await createDistinctGroupChannel({
      name: channelName,
      userIds: [user.$id, shopOwnerUserId],
      inviterUserId: user.$id,
    });

    return NextResponse.json({
      channelUrl: channel.channel_url,
    });
  } catch (error: unknown) {
    console.error("[chat/start]", error);
    const message =
      error instanceof Error ? error.message : "Could not start chat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
