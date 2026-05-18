import { Prisma } from "../../../generated/prisma/client";

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

export class ResponseDetailDocumentGuideDto {
  id: string;
  title: string;
  nameDocument: string;
  priceIdr: string | null;
  priceUsd: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags: ResponseDetailTagDto[];

  constructor(row: {
    id: string;
    title: string;
    nameDocument: string;
    priceIdr: Prisma.Decimal | null;
    priceUsd: Prisma.Decimal | null;
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
  }) {
    this.id = row.id;
    this.title = row.title;
    this.nameDocument = row.nameDocument;
    this.priceIdr = row.priceIdr?.toString() ?? null;
    this.priceUsd = row.priceUsd?.toString() ?? null;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
    this.tags = row.tagDocumentDestination.map((t) => new ResponseDetailTagDto(t));
  }
}
