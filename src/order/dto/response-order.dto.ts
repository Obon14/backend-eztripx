import { Prisma, StatusPayment } from "../../../generated/prisma/client";

export class ResponseOrderDocumentGuideDto {
  id: string;
  title: string;

  constructor(row: { id: string; title: string }) {
    this.id = row.id;
    this.title = row.title;
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
  createdAt: Date;
  updatedAt: Date;
  documentGuide: ResponseOrderDocumentGuideDto;

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
      createdAt: Date;
      updatedAt: Date;
      documentGuide: { id: string; title: string };
    },
  ) {
    this.id = row.id;
    this.price = row.price.toString();
    this.currency = row.currency;
    this.statusPayment = row.statusPayment;
    this.paymentProvider = row.paymentProvider;
    this.paymentUrl = row.paymentUrl;
    this.gatewayTransactionId = row.gatewayTransactionId;
    this.paidAt = row.paidAt;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
    this.documentGuide = new ResponseOrderDocumentGuideDto(row.documentGuide);
  }
}
