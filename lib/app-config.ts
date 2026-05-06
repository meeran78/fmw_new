import { normalizeCollectionIdEnv } from "@/lib/appwrite-collection-id";

export const APP_CONFIG = {
  APPWRITE: {
    KEY: process.env.NEXT_APPWRITE_KEY!,
    ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
    PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
    DATABASE_ID: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    SHOP_ID: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_SHOP_ID!,
    CAR_LISTING_ID: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_CAR_LISTING_ID!,
    BUCKET_IMAGES_ID: process.env.NEXT_PUBLIC_APPWRITE_BUCKET_IMAGES_ID!,
    SELLER_SCHEDULE_ID: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_SELLER_SCHEDULE_ID!,
    APPOINTMENTS_ID: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_APPOINTMENTS_ID!,
    SENDBIRD_API_TOKEN: process.env.NEXT_PUBLIC_SENDBIRD_API_TOKEN!,
    SENDBIRD_APP_ID: process.env.NEXT_PUBLIC_SENDBIRD_APP_ID!,
    APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
    /** Seller weekly availability (weekday + minute windows, UTC). */
    // SELLER_SCHEDULE_ID: normalizeCollectionIdEnv(
    //   process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_SELLER_SCHEDULE_ID
    // ),
    /** Buyer–seller appointments. */
    // APPOINTMENTS_ID: normalizeCollectionIdEnv(
    //   process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_APPOINTMENTS_ID
    // ),
  },
  SEND_BIRD: {
    APP_ID: process.env.NEXT_PUBLIC_SENDBIRD_APP_ID!,
  },
};
