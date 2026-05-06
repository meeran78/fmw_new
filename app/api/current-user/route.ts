import { APP_CONFIG } from "@/lib/app-config";
import { createSessionClient, getLoggedInUser } from "@/lib/appwrite";
import { NextResponse } from "next/server";
import { Query } from "node-appwrite";

export const dynamic = "force-dynamic";

export const GET = async () => {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({
        message: "Not authenticated",
        user: null,
        shop: null,
      });
    }

    const { databases } = await createSessionClient();

    const shopDocuments = await databases.listDocuments(
      APP_CONFIG.APPWRITE.DATABASE_ID,
      APP_CONFIG.APPWRITE.SHOP_ID,
      [Query.equal("userId", user.$id)]
    );

    const shop = shopDocuments.documents?.[0];

    return NextResponse.json({
      message: "User fetched successfully",
      user,
      shop,
    });
  } catch (error: unknown) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ message }, { status: 500 });
  }
};
