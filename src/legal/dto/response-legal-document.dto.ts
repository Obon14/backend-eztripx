import type { LegalDocument } from "../../../generated/prisma/client";

export class ResponsePublicLegalDto {
  slug: string;
  title: string;
  titleHighlight: string;
  intro: string;
  body: string;
  updatedAt: Date;

  constructor(
    row: LegalDocument,
    locale: "id" | "en",
  ) {
    this.slug = row.slug;
    this.title = locale === "en" ? row.titleEn : row.titleId;
    this.titleHighlight =
      locale === "en" ? row.titleHighlightEn : row.titleHighlightId;
    this.intro = locale === "en" ? row.introEn : row.introId;
    this.body = locale === "en" ? row.bodyEn : row.bodyId;
    this.updatedAt = row.updatedAt;
  }
}

export class ResponseAdminLegalDto {
  id: string;
  slug: string;
  titleId: string;
  titleEn: string;
  titleHighlightId: string;
  titleHighlightEn: string;
  introId: string;
  introEn: string;
  bodyId: string;
  bodyEn: string;
  updatedAt: Date;

  constructor(row: LegalDocument) {
    this.id = row.id;
    this.slug = row.slug;
    this.titleId = row.titleId;
    this.titleEn = row.titleEn;
    this.titleHighlightId = row.titleHighlightId;
    this.titleHighlightEn = row.titleHighlightEn;
    this.introId = row.introId;
    this.introEn = row.introEn;
    this.bodyId = row.bodyId;
    this.bodyEn = row.bodyEn;
    this.updatedAt = row.updatedAt;
  }
}
