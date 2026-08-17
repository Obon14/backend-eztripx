import {
  DocumentGuidePreviewMode,
  DocumentGuideStatus,
  Prisma,
} from "../../../generated/prisma/client";
import { buildPublicCoverImageUrl } from "../document-guide.storage";

export class ResponseDetailTagDto {
  id: number;
  region: { id: number; name: string };
  country: { id: number; name: string } | null;
  city: { id: number; name: string } | null;

  constructor(row: {
    id: number;
    region: { id: number; name: string };
    country: { id: number; name: string } | null;
    city: { id: number; name: string } | null;
  }) {
    this.id = row.id;
    this.region = row.region;
    this.country = row.country;
    this.city = row.city;
  }
}

export type AdminCoverImageItem = {
  id: string;
  filename: string;
  sortOrder: number;
  url: string;
};

export class ResponseDetailDocumentGuideDto {
  id: string;
  titleId: string;
  titleEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  nameDocument: string;
  tripDays: number | null;
  coverImages: AdminCoverImageItem[];
  priceIdr: string | null;
  priceUsd: string | null;
  status: DocumentGuideStatus;
  previewMode: DocumentGuidePreviewMode;
  previewPageCount: number;
  createdAt: Date;
  updatedAt: Date;
  tags: ResponseDetailTagDto[];

  constructor(row: {
    id: string;
    titleId: string;
    titleEn: string | null;
    description: string | null;
    descriptionEn: string | null;
    nameDocument: string;
    tripDays: number | null;
    priceIdr: Prisma.Decimal | null;
    priceUsd: Prisma.Decimal | null;
    status: DocumentGuideStatus;
    previewMode: DocumentGuidePreviewMode;
    previewPageCount: number;
    createdAt: Date;
    updatedAt: Date;
    tagDocumentDestination: Array<{
      id: number;
      regionId: number;
      countryId: number | null;
      cityId: number | null;
      region: { id: number; name: string };
      country: { id: number; name: string } | null;
      city: { id: number; name: string } | null;
    }>;
    coverImages: Array<{
      id: string;
      filename: string;
      sortOrder: number;
    }>;
  }) {
    this.id = row.id;
    this.titleId = row.titleId;
    this.titleEn = row.titleEn;
    this.description = row.description;
    this.descriptionEn = row.descriptionEn;
    this.nameDocument = row.nameDocument;
    this.tripDays = row.tripDays;
    this.coverImages = [...row.coverImages]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((img) => ({
        id: img.id,
        filename: img.filename,
        sortOrder: img.sortOrder,
        url: buildPublicCoverImageUrl(row.id, img.id),
      }));
    this.priceIdr = row.priceIdr?.toString() ?? null;
    this.priceUsd = row.priceUsd?.toString() ?? null;
    this.status = row.status;
    this.previewMode = row.previewMode;
    this.previewPageCount = row.previewPageCount;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
    this.tags = row.tagDocumentDestination.map((t) => new ResponseDetailTagDto(t));
  }
}
