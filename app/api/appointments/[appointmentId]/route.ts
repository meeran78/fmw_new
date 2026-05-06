import { APP_CONFIG } from "@/lib/app-config";
import {
  createAdminClient,
  createSessionClient,
  getLoggedInUser,
} from "@/lib/appwrite";
import { requireValidCollectionId } from "@/lib/appwrite-collection-id";
import { ACTIVE_APPOINTMENT_STATUSES } from "@/lib/appointment-scheduling";
import { NextRequest, NextResponse } from "next/server";

function assertCollections() {
  return requireValidCollectionId(
    APP_CONFIG.APPWRITE.APPOINTMENTS_ID,
    "NEXT_PUBLIC_APPWRITE_COLLECTION_APPOINTMENTS_ID"
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { appointmentId: string } }
) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action as string | undefined;
    if (action !== "cancel") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    const appointmentsId = assertCollections();
    const { databases } = await createAdminClient();
    const db = APP_CONFIG.APPWRITE.DATABASE_ID;

    const appt = await databases.getDocument(
      db,
      appointmentsId,
      params.appointmentId
    );

    const buyerUserId = String(appt.buyerUserId);
    const sellerUserId = String(appt.sellerUserId);
    const status = String(appt.status);

    if (!ACTIVE_APPOINTMENT_STATUSES.includes(status as "pending" | "confirmed")) {
      return NextResponse.json(
        { error: "This appointment cannot be cancelled" },
        { status: 400 }
      );
    }

    let nextStatus: string;
    if (user.$id === buyerUserId) {
      nextStatus = "cancelled_buyer";
    } else if (user.$id === sellerUserId) {
      nextStatus = "cancelled_seller";
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const start = new Date(String(appt.startDatetime));
    if (start.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Past appointments cannot be cancelled here" },
        { status: 400 }
      );
    }

    const { databases: sessionDb } = await createSessionClient();
    const updated = await sessionDb.updateDocument(
      db,
      appointmentsId,
      params.appointmentId,
      { status: nextStatus }
    );

    return NextResponse.json({
      message: "Appointment cancelled",
      appointment: updated,
    });
  } catch (error: unknown) {
    console.error("[appointments PATCH]", error);
    const message =
      error instanceof Error ? error.message : "Could not update appointment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
