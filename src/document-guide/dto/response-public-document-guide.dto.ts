import {
  DocumentGuidePreviewMode,
  Prisma,
} from "../../../generated/prisma/client";
import { buildPublicCoverImageUrl } from "../document-guide.storage";

function buildLocationLabel(
  tags: Array<{
    city: { name: string } | null;
    country: { name: string } | null;
    region: { name: string };
  }>,
): string {
  const first = tags[0];
  if (!first) return "";
  const parts: string[] = [];
  if (first.city?.name) parts.push(first.city.name);
  else if (first.country?.name) parts.push(first.country.name);
  else if (first.region?.name) parts.push(first.region.name);
  if (first.city?.name && first.country?.name) {
    parts.push(first.country.name);
  }
  return parts.join(", ");
}

export type PublicCoverImageItem = {
  id: string;
  url: string;
  sortOrder: number;
};

function resolveTitle(
  locale: "id" | "en" | undefined,
  titleId: string,
  titleEn: string | null,
): string {
  if (locale === "en") {
    return titleEn?.trim() || titleId;
  }
  return titleId;
}

export class ResponsePublicDocumentGuideDto {
  id: string;
  title: string;
  description: string | null;
  tripDays: number | null;
  priceIdr: string | null;
  priceUsd: string | null;
  coverImages: PublicCoverImageItem[];
  locationLabel: string;
  previewMode: DocumentGuidePreviewMode;
  /** Meaningful when previewMode = hide; ignored when show. */
  previewPageCount: number;

  constructor(
    row: {
      id: string;
      titleId: string;
      titleEn: string | null;
      description: string | null;
      tripDays: number | null;
      priceIdr: Prisma.Decimal | null;
      priceUsd: Prisma.Decimal | null;
      previewMode: DocumentGuidePreviewMode;
      previewPageCount: number;
      tagDocumentDestination: Array<{
        region: { name: string };
        country: { name: string } | null;
        city: { name: string } | null;
      }>;
      coverImages: Array<{
        id: string;
        filename: string;
        sortOrder: number;
      }>;
    },
    locale?: "id" | "en",
  ) {
    this.id = row.id;
    this.title = resolveTitle(locale, row.titleId, row.titleEn);
    this.description = row.description?.trim() || null;
    this.tripDays = row.tripDays;
    this.priceIdr = row.priceIdr?.toString() ?? null;
    this.priceUsd = row.priceUsd?.toString() ?? null;
    this.coverImages = [...row.coverImages]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((img) => ({
        id: img.id,
        url: buildPublicCoverImageUrl(row.id, img.id),
        sortOrder: img.sortOrder,
      }));
    this.locationLabel = buildLocationLabel(row.tagDocumentDestination);
    this.previewMode = row.previewMode;
    this.previewPageCount = row.previewPageCount;
  }
}
