import { Prisma } from "../../../generated/prisma/client";
import { ResponseDetailTagDto } from "./response-detail-document-guide.dto";

export class ResponseListDocumentGuideDto {
  id: string;
  title: string;
  nameDocument: string;
  priceIdr: string | null;
  priceUsd: string | null;
  tags: ResponseDetailTagDto[];
  createdAt: Date;

  constructor(row: {
    id: string;
    title: string;
    nameDocument: string;
    priceIdr: Prisma.Decimal | null;
    priceUsd: Prisma.Decimal | null;
    createdAt: Date;
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
    this.tags = row.tagDocumentDestination.map(
      (t) => new ResponseDetailTagDto(t),
    );
  }
}
