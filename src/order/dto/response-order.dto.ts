import { Prisma, StatusPayment } from "../../../generated/prisma/client";

export class ResponseOrderDocumentGuideDto {
  id: string;
  titleId: string;
  titleEn: string | null;

  constructor(row: { id: string; titleId: string; titleEn: string | null }) {
    this.id = row.id;
    this.titleId = row.titleId;
    this.titleEn = row.titleEn;
  }
}

export class ResponseOrderDto {
  id: string;
  price: string;
  currency: string;
  statusPayment: StatusPayment;
  paymentProvider: string;
  paymentUrl: string | null;
  gatewayTransactionId: string | null;
  paidAt: Date | null;
  emailDeliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  documentGuide: ResponseOrderDocumentGuideDto;
  hasReview: boolean;

  constructor(
    row: {
      id: string;
      price: Prisma.Decimal;
      currency: string;
      statusPayment: StatusPayment;
      paymentProvider: string;
      paymentUrl: string | null;
      gatewayTransactionId: string | null;
      paidAt: Date | null;
      emailDeliveredAt?: Date | null;
      createdAt: Date;
      updatedAt: Date;
      documentGuide: { id: string; titleId: string; titleEn: string | null };
    },
    hasReview = false,
  ) {
    this.id = row.id;
    this.price = row.price.toString();
    this.currency = row.currency;
    this.statusPayment = row.statusPayment;
    this.paymentProvider = row.paymentProvider;
    this.paymentUrl = row.paymentUrl;
    this.gatewayTransactionId = row.gatewayTransactionId;
    this.paidAt = row.paidAt;
    this.emailDeliveredAt = row.emailDeliveredAt ?? null;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
    this.documentGuide = new ResponseOrderDocumentGuideDto(row.documentGuide);
    this.hasReview = hasReview;
  }
}
