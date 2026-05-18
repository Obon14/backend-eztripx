import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Xendit } from "xendit-node";
import type { CreateInvoiceRequest } from "xendit-node/invoice/models";

@Injectable()
export class XenditService {
  private readonly client: Xendit;

  constructor(config: ConfigService) {
    this.client = new Xendit({
      secretKey: config.getOrThrow<string>("XENDIT_SECRET_KEY"),
    });
  }

  createInvoice(data: CreateInvoiceRequest) {
    return this.client.Invoice.createInvoice({ data });
  }

  getInvoiceById(invoiceId: string) {
    return this.client.Invoice.getInvoiceById({ invoiceId });
  }
}
