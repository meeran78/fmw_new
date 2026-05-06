import { APP_CONFIG } from "@/lib/app-config";
import { createAdminClient } from "@/lib/appwrite";
import { ACTIVE_APPOINTMENT_STATUSES, DayWindow } from "@/lib/appointment-scheduling";
import {
  eachEasternDateInclusive,
  easternDateStringFromUtc,
  easternNowStartOfDay,
  generateSlotsForEasternDate,
  parseEasternDateOnly,
  SCHED_MAX_HORIZON_DAYS,
} from "@/lib/eastern-scheduling";
import { requireValidCollectionId } from "@/lib/appwrite-collection-id";
import { dayWindowFromScheduleDoc } from "@/lib/seller-schedule-appwrite";
import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";

function assertCollections() {
  const appointmentsId = requireValidCollectionId(
    APP_CONFIG.APPWRITE.APPOINTMENTS_ID,
    "NEXT_PUBLIC_APPWRITE_COLLECTION_APPOINTMENTS_ID"
  );
  const scheduleId = requireValidCollectionId(
    APP_CONFIG.APPWRITE.SELLER_SCHEDULE_ID,
    "NEXT_PUBLIC_APPWRITE_COLLECTION_SELLER_SCHEDULE_ID"
  );
  return { appointmentsId, scheduleId };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sellerUserId = searchParams.get("sellerUserId")?.trim();
    const shopId = searchParams.get("shopId")?.trim();
    const fromStr = searchParams.get("from")?.trim();
    const toStr = searchParams.get("to")?.trim();

    if (!sellerUserId || !shopId || !fromStr || !toStr) {
      return NextResponse.json(
        {
          error:
            "sellerUserId, shopId, from, and to are required (from/to are YYYY-MM-DD US Eastern)",
        },
        { status: 400 }
      );
    }

    let fromDay: ReturnType<typeof parseEasternDateOnly>;
    let toDay: ReturnType<typeof parseEasternDateOnly>;
    try {
      fromDay = parseEasternDateOnly(fromStr);
      toDay = parseEasternDateOnly(toStr);
    } catch {
      return NextResponse.json(
        { error: "from and to must be valid dates (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    if (fromDay > toDay) {
      return NextResponse.json({ error: "`from` must be on or before `to`" }, { status: 400 });
    }

    const maxHorizonDay = easternNowStartOfDay().plus({
      days: SCHED_MAX_HORIZON_DAYS,
    });
    if (toDay > maxHorizonDay) {
      return NextResponse.json(
        { error: `Bookings limited to ${SCHED_MAX_HORIZON_DAYS} Eastern calendar days ahead` },
        { status: 400 }
      );
    }

    const { appointmentsId, scheduleId } = assertCollections();
    const { databases } = await createAdminClient();
    const db = APP_CONFIG.APPWRITE.DATABASE_ID;

    const scheduleDocs = await databases.listDocuments(db, scheduleId, [
      Query.equal("shopId", shopId),
    ]);

    const windows: DayWindow[] = scheduleDocs.documents
      .map(dayWindowFromScheduleDoc)
      .filter((w): w is DayWindow => w != null);

    const appointmentDocs = await databases.listDocuments(db, appointmentsId, [
      Query.equal("sellerUserId", sellerUserId),
      Query.equal("shopId", shopId),
    ]);

    const bookings = appointmentDocs.documents
      .filter((d) =>
        ACTIVE_APPOINTMENT_STATUSES.includes(
          d.status as (typeof ACTIVE_APPOINTMENT_STATUSES)[number]
        )
      )
      .map((d) => ({
        start: new Date(String(d.startDatetime)),
        end: new Date(String(d.endDatetime)),
      }));

    const now = new Date();
    const slotsOut: { start: string; end: string }[] = [];

    const dates = eachEasternDateInclusive(fromStr, toStr);
    for (const ymd of dates) {
      const dayBookings = bookings.filter(
        (b) => easternDateStringFromUtc(b.start) === ymd
      );
      const slots = generateSlotsForEasternDate(ymd, windows, dayBookings, now);
      for (const s of slots) {
        slotsOut.push({
          start: s.start.toISOString(),
          end: s.end.toISOString(),
        });
      }
    }

    return NextResponse.json({
      slots: slotsOut,
      windowsConfigured: windows.length > 0,
      timeZone: "America/New_York",
    });
  } catch (error: unknown) {
    console.error("[appointments/slots]", error);
    const message =
      error instanceof Error ? error.message : "Could not load slots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
