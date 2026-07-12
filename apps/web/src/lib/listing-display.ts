import type {
  ListingPricing,
  PublicListing,
  PublicListingLocation,
  PublicListingMedia,
} from '@bdph/types';

// Locale-aware presentation helpers for the public catalog. Listings carry both
// English and Bangla copy (MAP-6); we show the viewer's locale and fall back to
// English when the Bangla variant is absent. Pure functions — no React — so they
// can be reused by cards and the detail view and unit-tested in isolation.

type LocaleText = Pick<PublicListing, 'titleEn' | 'titleBn'>;
type LocaleDescription = Pick<PublicListing, 'descriptionEn' | 'descriptionBn'>;

export function listingTitle(listing: LocaleText, locale: string): string {
  if (locale === 'bn' && listing.titleBn) return listing.titleBn;
  return listing.titleEn;
}

export function listingDescription(listing: LocaleDescription, locale: string): string | null {
  if (locale === 'bn' && listing.descriptionBn) return listing.descriptionBn;
  return listing.descriptionEn;
}

// Area-level only (A5/MAP-2): the administrative chain from the finest level the
// seller chose up to the division. Exact coordinates and address_line are never in
// the public projection, so they can never appear here. Reads finest → coarsest
// (e.g. "Savar, Dhaka, Dhaka") and drops any level the seller didn't fill in, so a
// district-only listing still reads "Dhaka, Dhaka".
export function locationLabel(location: PublicListingLocation | null, locale: string): string | null {
  if (!location) return null;
  const bn = locale === 'bn';
  const parts = [
    bn ? location.areaThanaNameBn : location.areaThanaNameEn,
    bn ? location.cityUpazilaNameBn : location.cityUpazilaNameEn,
    bn ? location.districtNameBn : location.districtNameEn,
    bn ? location.divisionNameBn : location.divisionNameEn,
  ];
  // Drop absent levels and collapse an adjacent duplicate (e.g. a "Dhaka" upazila
  // inside "Dhaka" district) so the label never repeats the same name back to back.
  const shown = parts.filter((part): part is string => Boolean(part));
  const deduped = shown.filter((part, index) => part !== shown[index - 1]);
  return deduped.join(', ');
}

// Bengali numerals for the bn locale, Western digits otherwise — matches the
// numeral style used elsewhere in the bn message catalog.
export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-US').format(value);
}

export function formatAmountBdt(amount: number, locale: string): string {
  return formatNumber(amount, locale);
}

// Builds the price line. `t` is the catalog translator (next-intl). Returns a
// translated "Price on request" when no amount is set or the seller marked it
// on-request; otherwise the formatted taka amount with rent period / negotiable
// qualifiers appended.
export function priceLabel(
  pricing: ListingPricing,
  locale: string,
  t: (key: string) => string,
): string {
  if (pricing.priceType === 'on_request' || pricing.amountBdt == null) {
    return t('priceOnRequest');
  }

  let label = `৳ ${formatAmountBdt(pricing.amountBdt, locale)}`;
  if (pricing.rentPeriod === 'monthly') label += ` ${t('perMonth')}`;
  else if (pricing.rentPeriod === 'yearly') label += ` ${t('perYear')}`;
  if (pricing.priceType === 'negotiable') label += ` · ${t('priceNegotiable')}`;
  return label;
}

// Cover photo for a card: the lowest-position `photo`-kind item. Media is already
// `ready`-only in the public projection. Returns null when the listing has none.
export function coverPhoto(media: PublicListingMedia[]): PublicListingMedia | null {
  const photos = media
    .filter((item) => item.kind === 'photo')
    .sort((a, b) => a.position - b.position);
  return photos[0] ?? null;
}

// All gallery photos in display order.
export function orderedPhotos(media: PublicListingMedia[]): PublicListingMedia[] {
  return media
    .filter((item) => item.kind === 'photo')
    .sort((a, b) => a.position - b.position);
}
