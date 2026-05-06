import {
  CAR_BRAND_OPTIONS,
  CAR_COLOR_OPTIONS,
  CAR_MODEL_OPTIONS,
  CAR_YEAR_OPTIONS,
} from "@/constants/car-options";

function getLabel(
  value: string,
  options: { value: string; label: string }[]
): string {
  const option = options.find((opt) => opt.value === value);
  return option ? option.label : value;
}

/** Title derived from stored listing fields when `displayTitle` is not in the DB. */
export function buildListingDisplayTitle(listing: {
  brand?: string;
  model?: string;
  yearOfManufacture?: string | number;
  exteriorColor?: string;
  condition?: string;
}): string {
  const year =
    listing.yearOfManufacture != null
      ? String(listing.yearOfManufacture)
      : "";

  const parts = [
    listing.condition === "BRAND_NEW" ? "New" : null,
    listing.brand ? getLabel(listing.brand, CAR_BRAND_OPTIONS) : null,
    listing.model ? getLabel(listing.model, CAR_MODEL_OPTIONS) : null,
    year ? getLabel(year, CAR_YEAR_OPTIONS) : null,
    listing.exteriorColor && listing.exteriorColor !== "other"
      ? getLabel(listing.exteriorColor, CAR_COLOR_OPTIONS)
      : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" ") : "Listing";
}
