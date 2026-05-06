import { APP_CONFIG } from "@/lib/app-config";
import {
  createAdminClient,
  getLoggedInUser,
} from "@/lib/appwrite";
import { requireValidCollectionId } from "@/lib/appwrite-collection-id";
import { parseTimeToMinutes } from "@/lib/appointment-scheduling";
import {
  dayWindowFromScheduleDoc,
  scheduleRuleToAppwriteAttrs,
} from "@/lib/seller-schedule-appwrite";
import { schedulePutSchema } from "@/validation/appointment.validation";
import { NextRequest, NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";

function assertScheduleCollection(): string {
  return requireValidCollectionId(
    APP_CONFIG.APPWRITE.SELLER_SCHEDULE_ID,
    "NEXT_PUBLIC_APPWRITE_COLLECTION_SELLER_SCHEDULE_ID"
  );
}

async function getOwnedShopId(userId: string): Promise<string | null> {
  const { databases } = await createAdminClient();
  const shops = await databases.listDocuments(
    APP_CONFIG.APPWRITE.DATABASE_ID,
    APP_CONFIG.APPWRITE.SHOP_ID,
    [Query.equal("userId", userId), Query.limit(1)]
  );
  return shops.documents[0]?.$id ?? null;
}

/** Seller reads weekly availability rows for their shop. */
export async function GET() {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = await getOwnedShopId(user.$id);
    if (!shopId) {
      return NextResponse.json({ rules: [], shopId: null });
    }

    const scheduleId = assertScheduleCollection();
    const { databases } = await createAdminClient();
    const docs = await databases.listDocuments(
      APP_CONFIG.APPWRITE.DATABASE_ID,
      scheduleId,
      [Query.equal("shopId", shopId)]
    );

    const rules = docs.documents
      .map((d) => {
        const w = dayWindowFromScheduleDoc(d);
        if (!w) return null;
        return { $id: d.$id, ...w };
      })
      .filter((r): r is NonNullable<typeof r> => r != null);

    return NextResponse.json({ shopId, rules });
  } catch (error: unknown) {
    console.error("[schedule GET]", error);
    const message =
      error instanceof Error ? error.message : "Could not load schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Replace weekly availability (Eastern local wall-clock windows per weekday).
 * Optional convenience: pass human-friendly times instead of minutes via `humanRules`.
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = await getOwnedShopId(user.$id);
    if (!shopId) {
      return NextResponse.json(
        { error: "You need a shop before setting availability" },
        { status: 403 }
      );
    }

    const body = await req.json();
    let rulesInput = body.rules;

    if (Array.isArray(body.humanRules)) {
      rulesInput = body.humanRules.map(
        (r: {
          weekday: number;
          startTime: string;
          endTime: string;
          slotMinutes?: number;
        }) => ({
          weekday: r.weekday,
          startMinute: parseTimeToMinutes(r.startTime),
          endMinute: parseTimeToMinutes(r.endTime),
          slotMinutes: r.slotMinutes ?? 30,
        })
      );
    }

    const parsed = schedulePutSchema.parse({ rules: rulesInput });

    for (const r of parsed.rules) {
      if (r.startMinute >= r.endMinute) {
        return NextResponse.json(
          { error: `Invalid window on weekday ${r.weekday}: start before end` },
          { status: 400 }
        );
      }
    }

    const scheduleId = assertScheduleCollection();
    const db = APP_CONFIG.APPWRITE.DATABASE_ID;
    const { databases } = await createAdminClient();

    const existing = await databases.listDocuments(db, scheduleId, [
      Query.equal("shopId", shopId),
    ]);

    for (const doc of existing.documents) {
      await databases.deleteDocument(db, scheduleId, doc.$id);
    }

    for (const r of parsed.rules) {
      await databases.createDocument(db, scheduleId, ID.unique(), {
        shopId,
        ...scheduleRuleToAppwriteAttrs(r),
      });
    }

    return NextResponse.json({
      message: "Availability updated",
      count: parsed.rules.length,
    });
  } catch (error: unknown) {
    console.error("[schedule PUT]", error);
    const message =
      error instanceof Error ? error.message : "Could not save schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
