import { Prisma, StatusPayment } from "../../../generated/prisma/client";
import { ResponseOrderDocumentGuideDto } from "./response-order.dto";

export class ResponseAdminOrderDto {
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
  user: { id: string; email: string };

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
      user: { id: string; email: string };
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
    this.emailDeliveredAt = row.emailDeliveredAt ?? null;
    this.createdAt = row.createdAt;
    this.updatedAt = row.updatedAt;
    this.documentGuide = new ResponseOrderDocumentGuideDto(row.documentGuide);
    this.user = row.user;
  }
}
