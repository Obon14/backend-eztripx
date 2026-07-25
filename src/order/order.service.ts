import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  DocumentGuideStatus,
  PaymentProvider,
  Prisma,
  StatusPayment,
} from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { XenditService } from "../xendit/xendit.service";
import { ErrorMessages } from "../common/constants/message.constants";
import { RoleEnums } from "../common/enum/role.enum";
import { CreateOrderDto } from "./dto/create-order.dto";
import { ResponseOrderDto } from "./dto/response-order.dto";
import type { InvoiceStatus } from "xendit-node/invoice/models";
import { MailService } from "../mail/mail.service";

const DEFAULT_INVOICE_DURATION_SEC = 86_400;

const orderGuideSelect = {
  id: true,
  titleId: true,
  titleEn: true,
  nameDocument: true,
} as const;

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xendit: XenditService,
    private readonly mail: MailService,
  ) {}

  async create(userId: string, userEmail: string, dto: CreateOrderDto) {
    const guide = await this.prisma.documentGuide.findUnique({
      where: { id: dto.documentGuideId },
      select: {
        id: true,
        titleId: true,
        titleEn: true,
        priceIdr: true,
        priceUsd: true,
        status: true,
      },
    });
    if (!guide) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    if (guide.status !== DocumentGuideStatus.published) {
      throw new BadRequestException(ErrorMessages.DOCUMENT_GUIDE_NOT_PUBLISHED);
    }

    const existing = await this.resolveExistingOrderBeforeCheckout(
      userId,
      guide.id,
    );
    if (existing?.statusPayment === StatusPayment.PAID) {
      throw new ConflictException(ErrorMessages.ORDER_ALREADY_PURCHASED);
    }
    if (existing?.statusPayment === StatusPayment.PENDING) {
      if (!existing.paymentUrl) {
        throw new BadRequestException(ErrorMessages.ORDER_PAYMENT_NOT_INITIATED);
      }
      return new ResponseOrderDto(existing);
    }

    const price = this.resolveGuidePrice(guide, dto.currency);

    const order = await this.prisma.order.create({
      data: {
        userId,
        documentGuideId: guide.id,
        price,
        currency: dto.currency,
        statusPayment: StatusPayment.PENDING,
        paymentProvider: PaymentProvider.XENDIT,
      },
    });

    try {
      const returnBase =
        process.env.PAYMENT_RETURN_URL?.trim() ||
        process.env.FRONTEND_URL?.trim() ||
        "http://localhost:3000";
      const successRedirectUrl = `${returnBase.replace(/\/$/, "")}/payment/return?orderId=${order.id}`;

      const invoice = await this.xendit.createInvoice({
        externalId: order.id,
        amount: this.toXenditAmount(price, dto.currency),
        currency: dto.currency,
        description: guide.titleEn?.trim() || guide.titleId,
        payerEmail: userEmail,
        invoiceDuration: DEFAULT_INVOICE_DURATION_SEC,
        successRedirectUrl,
      });

      const updated = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          gatewayTransactionId: invoice.id ?? null,
          paymentUrl: invoice.invoiceUrl ?? null,
        },
        include: {
          documentGuide: { select: orderGuideSelect },
        },
      });

      return new ResponseOrderDto(updated);
    } catch (err) {
      await this.prisma.order.delete({ where: { id: order.id } });
      throw err;
    }
  }

  async findAllByUser(userId: string) {
    const rows = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        documentGuide: { select: orderGuideSelect },
      },
    });
    return rows.map((row) => new ResponseOrderDto(row));
  }

  async findOneForUser(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        documentGuide: { select: orderGuideSelect },
      },
    });
    if (!order) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    return new ResponseOrderDto(order);
  }

  async syncPaymentStatus(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    if (!order.gatewayTransactionId) {
      throw new BadRequestException(ErrorMessages.ORDER_PAYMENT_NOT_INITIATED);
    }

    const invoice = await this.xendit.getInvoiceById(order.gatewayTransactionId);
    const updated = await this.applyPaymentStatus(order.id, invoice.status, {
      gatewayTransactionId: invoice.id ?? order.gatewayTransactionId,
    });
    return new ResponseOrderDto(updated);
  }

  /**
   * Xendit invoice webhook (Invoice API). Idempotent — safe to retry.
   */
  async handleXenditInvoiceWebhook(payload: Record<string, unknown>) {
    const externalId = this.readWebhookField(payload, "external_id", "externalId");
    const invoiceId = this.readWebhookField(payload, "id", "invoice_id");
    const status = this.readWebhookField(payload, "status");

    if (!externalId || !status) {
      throw new BadRequestException("Invalid Xendit webhook payload");
    }

    const order = await this.prisma.order.findUnique({
      where: { id: externalId },
    });

    if (!order) {
      return { ok: true, ignored: true, reason: "order_not_found" };
    }

    if (
      invoiceId &&
      order.gatewayTransactionId &&
      order.gatewayTransactionId !== invoiceId
    ) {
      return { ok: true, ignored: true, reason: "invoice_id_mismatch" };
    }

    const updated = await this.applyPaymentStatus(
      order.id,
      status as InvoiceStatus,
      {
        gatewayTransactionId: invoiceId ?? order.gatewayTransactionId,
      },
    );

    return {
      ok: true,
      orderId: updated.id,
      statusPayment: updated.statusPayment,
    };
  }

  async assertUserCanAccessGuide(
    documentGuideId: string,
    userId: string,
    role: RoleEnums | string,
  ) {
    if (role === RoleEnums.ADMIN) {
      return;
    }

    const paidOrder = await this.prisma.order.findFirst({
      where: {
        documentGuideId,
        userId,
        statusPayment: StatusPayment.PAID,
      },
    });

    if (!paidOrder) {
      throw new ForbiddenException(ErrorMessages.ORDER_PAYMENT_REQUIRED);
    }
  }

  private resolveGuidePrice(
    guide: {
      priceIdr: Prisma.Decimal | null;
      priceUsd: Prisma.Decimal | null;
    },
    currency: string,
  ): Prisma.Decimal {
    const raw = currency === "IDR" ? guide.priceIdr : guide.priceUsd;
    if (raw == null || raw.lte(0)) {
      throw new BadRequestException(ErrorMessages.ORDER_PRICE_UNAVAILABLE);
    }
    return raw;
  }

  private toXenditAmount(price: Prisma.Decimal, currency: string): number {
    const value = price.toNumber();
    if (currency === "IDR") {
      return Math.round(value);
    }
    return Math.round(value * 100) / 100;
  }

  /**
   * Blocks duplicate checkout: one PAID per user+guide, resume active PENDING.
   * Syncs stale PENDING with Xendit so expired invoices allow a new order.
   */
  private async resolveExistingOrderBeforeCheckout(
    userId: string,
    documentGuideId: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        userId,
        documentGuideId,
        statusPayment: {
          in: [StatusPayment.PAID, StatusPayment.PENDING],
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        documentGuide: { select: orderGuideSelect },
      },
    });

    if (!order || order.statusPayment !== StatusPayment.PENDING) {
      return order;
    }

    if (!order.gatewayTransactionId) {
      return order;
    }

    const invoice = await this.xendit.getInvoiceById(order.gatewayTransactionId);
    const nextStatus = this.mapXenditStatus(invoice.status);

    if (nextStatus === order.statusPayment) {
      return order;
    }

    return this.applyPaymentStatus(order.id, invoice.status, {
      gatewayTransactionId: invoice.id ?? order.gatewayTransactionId,
    });
  }

  private async applyPaymentStatus(
    orderId: string,
    invoiceStatus: InvoiceStatus | string,
    opts?: { gatewayTransactionId?: string | null },
  ) {
    const nextStatus = this.mapXenditStatus(invoiceStatus as InvoiceStatus);
    const existing = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }

    const becamePaid =
      existing.statusPayment !== StatusPayment.PAID &&
      nextStatus === StatusPayment.PAID;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        statusPayment: nextStatus,
        gatewayTransactionId:
          opts?.gatewayTransactionId ?? existing.gatewayTransactionId,
        paidAt:
          nextStatus === StatusPayment.PAID
            ? (existing.paidAt ?? new Date())
            : existing.paidAt,
      },
      include: {
        documentGuide: { select: orderGuideSelect },
        user: { select: { email: true } },
      },
    });

    if (
      becamePaid &&
      !updated.emailDeliveredAt &&
      updated.user?.email &&
      updated.documentGuide
    ) {
      const locale = updated.currency === "USD" ? "en" : "id";
      const guideTitle =
        locale === "en"
          ? updated.documentGuide.titleEn?.trim() ||
            updated.documentGuide.titleId
          : updated.documentGuide.titleId;

      const sent = await this.mail.sendGuidePurchaseEmail({
        to: updated.user.email,
        guideTitle,
        guideId: updated.documentGuide.id,
        nameDocument: updated.documentGuide.nameDocument,
        locale,
      });

      if (sent) {
        return this.prisma.order.update({
          where: { id: orderId },
          data: { emailDeliveredAt: new Date() },
          include: {
            documentGuide: { select: orderGuideSelect },
          },
        });
      }
      this.logger.warn(
        `Guide email not sent for order ${orderId} (check SMTP/logs)`,
      );
    }

    return updated;
  }

  private readWebhookField(
    payload: Record<string, unknown>,
    ...keys: string[]
  ): string | undefined {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return undefined;
  }

  private mapXenditStatus(status: InvoiceStatus): StatusPayment {
    switch (status) {
      case "PAID":
      case "SETTLED":
        return StatusPayment.PAID;
      case "EXPIRED":
        return StatusPayment.CANCELED;
      case "PENDING":
        return StatusPayment.PENDING;
      default:
        return StatusPayment.FAILED;
    }
  }
}
