import type { Models } from "node-appwrite";
import { buildListingDisplayTitle } from "@/lib/listing-display-title";

export type EnrichedShop = {
  $id: string;
  shopName: string;
  userId: string;
  description?: string;
};

/** Appwrite returns relationship `shop` as a plain document ID string unless expanded. */
export function getListingShopDocumentId(
  listing: Record<string, unknown>
): string | null {
  const raw = listing.shop;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (raw && typeof raw === "object" && "$id" in raw) {
    const id = (raw as { $id?: string }).$id;
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  const sid = listing.shopId;
  if (typeof sid === "string" && sid.trim()) return sid.trim();
  return null;
}

export function enrichListingDocument(
  listing: Models.Document,
  shopDoc: Models.Document | null
): Models.Document & {
  shop?: EnrichedShop;
  shopId?: string;
  displayTitle: string;
} {
  const shopId = getListingShopDocumentId(listing as Record<string, unknown>);
  const shop: EnrichedShop | undefined = shopDoc
    ? {
        $id: shopDoc.$id,
        shopName: String(
          (shopDoc as Record<string, unknown>).shopName ?? "Seller"
        ),
        userId: String((shopDoc as Record<string, unknown>).userId ?? ""),
        description:
          typeof (shopDoc as Record<string, unknown>).description === "string"
            ? ((shopDoc as Record<string, unknown>).description as string)
            : undefined,
      }
    : undefined;

  const existingTitle =
    typeof (listing as Record<string, unknown>).displayTitle === "string"
      ? ((listing as Record<string, unknown>).displayTitle as string).trim()
      : "";

  const displayTitle =
    existingTitle ||
    buildListingDisplayTitle({
      brand: listing.brand as string | undefined,
      model: listing.model as string | undefined,
      yearOfManufacture: listing.yearOfManufacture as string | number | undefined,
      exteriorColor: listing.exteriorColor as string | undefined,
      condition: listing.condition as string | undefined,
    });

  return {
    ...listing,
    shopId: shopId ?? shop?.$id,
    shop,
    displayTitle,
  };
}
