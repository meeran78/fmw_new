import { APP_CONFIG } from "@/lib/app-config";
import {
  createAdminClient,
  createSessionClient,
  getLoggedInUser,
} from "@/lib/appwrite";
import {
  ACTIVE_APPOINTMENT_STATUSES,
  DayWindow,
  isSlotAllowed,
  SCHED_MAX_HORIZON_DAYS,
} from "@/lib/appointment-scheduling";
import {
  easternDateStringFromUtc,
  easternNowStartOfDay,
  generateSlotsForEasternDate,
} from "@/lib/eastern-scheduling";
import { requireValidCollectionId } from "@/lib/appwrite-collection-id";
import { dayWindowFromScheduleDoc } from "@/lib/seller-schedule-appwrite";
import { appointmentBookSchema } from "@/validation/appointment.validation";
import { NextRequest, NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";

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

export async function GET() {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appointmentsId } = assertCollections();
    const { databases } = await createAdminClient();
    const db = APP_CONFIG.APPWRITE.DATABASE_ID;

    const asBuyer = await databases.listDocuments(db, appointmentsId, [
      Query.equal("buyerUserId", user.$id),
      Query.orderDesc("startDatetime"),
      Query.limit(100),
    ]);

    const asSeller = await databases.listDocuments(db, appointmentsId, [
      Query.equal("sellerUserId", user.$id),
      Query.orderDesc("startDatetime"),
      Query.limit(100),
    ]);

    return NextResponse.json({
      asBuyer: asBuyer.documents,
      asSeller: asSeller.documents,
    });
  } catch (error: unknown) {
    console.error("[appointments GET]", error);
    const message =
      error instanceof Error ? error.message : "Could not load appointments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = appointmentBookSchema.parse(body);

    if (parsed.sellerUserId === user.$id) {
      return NextResponse.json(
        { error: "You cannot book an appointment with yourself" },
        { status: 400 }
      );
    }

    const start = new Date(parsed.startDatetime);
    const end = new Date(parsed.endDatetime);
    if (!(start < end)) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    const startEtDay = easternDateStringFromUtc(start);
    const maxEtDay = easternNowStartOfDay()
      .plus({ days: SCHED_MAX_HORIZON_DAYS })
      .toFormat("yyyy-MM-dd");
    if (startEtDay > maxEtDay) {
      return NextResponse.json(
        {
          error: `Appointments cannot be beyond ${SCHED_MAX_HORIZON_DAYS} Eastern calendar days ahead`,
        },
        { status: 400 }
      );
    }

    const { appointmentsId, scheduleId } = assertCollections();
    const { databases } = await createAdminClient();
    const db = APP_CONFIG.APPWRITE.DATABASE_ID;

    const scheduleDocs = await databases.listDocuments(db, scheduleId, [
      Query.equal("shopId", parsed.shopId),
    ]);

    const windows: DayWindow[] = scheduleDocs.documents
      .map(dayWindowFromScheduleDoc)
      .filter((w): w is DayWindow => w != null);

    if (windows.length === 0) {
      return NextResponse.json(
        {
          error:
            "This seller has not published availability yet. Try again later.",
        },
        { status: 409 }
      );
    }

    const shop = await databases.getDocument(
      db,
      APP_CONFIG.APPWRITE.SHOP_ID,
      parsed.shopId
    );
    if (String(shop.userId) !== parsed.sellerUserId) {
      return NextResponse.json(
        { error: "Seller does not match this shop" },
        { status: 400 }
      );
    }

    if (parsed.listingId) {
      const listing = await databases.getDocument(
        db,
        APP_CONFIG.APPWRITE.CAR_LISTING_ID,
        parsed.listingId
      );
      const listingShopRef =
        typeof listing.shop === "string"
          ? listing.shop
          : (listing.shop as { $id?: string } | undefined)?.$id;
      if (listingShopRef !== parsed.shopId) {
        return NextResponse.json(
          { error: "Listing does not belong to this shop" },
          { status: 400 }
        );
      }
    }

    const appointmentDocs = await databases.listDocuments(db, appointmentsId, [
      Query.equal("sellerUserId", parsed.sellerUserId),
      Query.equal("shopId", parsed.shopId),
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

    const allowed = generateSlotsForEasternDate(
      easternDateStringFromUtc(start),
      windows,
      bookings,
      new Date()
    );
    if (!isSlotAllowed(start, end, allowed)) {
      return NextResponse.json(
        {
          error:
            "This time slot is no longer available. Refresh and pick another slot.",
        },
        { status: 409 }
      );
    }

    const { databases: sessionDb } = await createSessionClient();
    const doc = await sessionDb.createDocument(
      db,
      appointmentsId,
      ID.unique(),
      {
        buyerUserId: user.$id,
        sellerUserId: parsed.sellerUserId,
        shopId: parsed.shopId,
        listingId: parsed.listingId ?? "",
        startDatetime: start.toISOString(),
        endDatetime: end.toISOString(),
        status: "confirmed",
        notes: parsed.notes ?? "",
      }
    );

    return NextResponse.json({
      message: "Appointment booked",
      appointment: doc,
    });
  } catch (error: unknown) {
    console.error("[appointments POST]", error);
    const message =
      error instanceof Error ? error.message : "Could not book appointment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
