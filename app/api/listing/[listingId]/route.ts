import { APP_CONFIG } from "@/lib/app-config";
import { createAnonymousClient } from "@/lib/appwrite";
import {
  enrichListingDocument,
  getListingShopDocumentId,
} from "@/lib/enrich-listing";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (
  req: NextRequest,
  { params }: { params: { listingId: string } }
) => {
  try {
    const { listingId } = params;
    const { databases } = await createAnonymousClient();

    const listing = await databases.getDocument(
      APP_CONFIG.APPWRITE.DATABASE_ID,
      APP_CONFIG.APPWRITE.CAR_LISTING_ID,
      listingId
    );

    const shopDocId = getListingShopDocumentId(
      listing as unknown as Record<string, unknown>
    );
    let shopDoc = null;
    if (shopDocId) {
      try {
        shopDoc = await databases.getDocument(
          APP_CONFIG.APPWRITE.DATABASE_ID,
          APP_CONFIG.APPWRITE.SHOP_ID,
          shopDocId
        );
      } catch {
        shopDoc = null;
      }
    }

    const payload = enrichListingDocument(listing, shopDoc);

    return NextResponse.json(
      {
        message: "Listing fetched successfully",
        listing: payload,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
};
