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
import {
  MidtransService,
  type MidtransTransactionStatus,
} from "../midtrans/midtrans.service";
import { ErrorMessages } from "../common/constants/message.constants";
import { RoleEnums } from "../common/enum/role.enum";
import { CreateOrderDto } from "./dto/create-order.dto";
import { ResponseOrderDto } from "./dto/response-order.dto";
import { ResponseAdminOrderDto } from "./dto/response-admin-order.dto";
import { OrderAdminQueryDto } from "./dto/order-admin-query.dto";
import { MailService } from "../mail/mail.service";

const DEFAULT_SNAP_EXPIRY_SEC = 86_400;

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
    private readonly midtrans: MidtransService,
    private readonly mail: MailService,
  ) {}

  async create(userId: string, userEmail: string, dto: CreateOrderDto) {
    const paymentBypassEnabled = this.isPaymentBypassEnabled();
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

    if (!paymentBypassEnabled && dto.currency !== "IDR") {
      throw new BadRequestException(ErrorMessages.ORDER_CURRENCY_NOT_SUPPORTED);
    }

    const existing = await this.resolveExistingOrderBeforeCheckout(
      userId,
      guide.id,
    );
    if (existing?.statusPayment === StatusPayment.PAID) {
      throw new ConflictException(ErrorMessages.ORDER_ALREADY_PURCHASED);
    }
    if (existing?.statusPayment === StatusPayment.PENDING) {
      if (paymentBypassEnabled) {
        const updated = await this.applyPaymentStatus(existing.id, "settlement");
        return new ResponseOrderDto(updated);
      }
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
        paymentProvider: PaymentProvider.MIDTRANS,
      },
    });

    try {
      if (paymentBypassEnabled) {
        const updated = await this.applyPaymentStatus(order.id, "settlement");
        return new ResponseOrderDto(updated);
      }

      const returnBase =
        process.env.PAYMENT_RETURN_URL?.trim() ||
        process.env.FRONTEND_URL?.trim() ||
        "http://localhost:3000";
      const finishRedirectUrl = `${returnBase.replace(/\/$/, "")}/payment/return?orderId=${order.id}`;

      const itemName = (
        guide.titleEn?.trim() ||
        guide.titleId ||
        "Document Guide"
      ).slice(0, 50);
      const grossAmount = this.toMidtransAmount(price);

      const snap = await this.midtrans.createSnapTransaction({
        transaction_details: {
          order_id: order.id,
          gross_amount: grossAmount,
        },
        item_details: [
          {
            id: guide.id,
            price: grossAmount,
            quantity: 1,
            name: itemName,
          },
        ],
        customer_details: {
          email: userEmail,
        },
        credit_card: {
          secure: true,
        },
        callbacks: {
          finish: finishRedirectUrl,
        },
        expiry: {
          unit: "seconds",
          duration: DEFAULT_SNAP_EXPIRY_SEC,
        },
      });

      const updated = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          gatewayTransactionId: snap.token ?? null,
          paymentUrl: snap.redirect_url ?? null,
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
    const guideIds = [...new Set(rows.map((row) => row.documentGuideId))];
    const reviews =
      guideIds.length === 0
        ? []
        : await this.prisma.review.findMany({
            where: { userId, documentGuideId: { in: guideIds } },
            select: { documentGuideId: true },
          });
    const reviewed = new Set(reviews.map((row) => row.documentGuideId));
    return rows.map(
      (row) => new ResponseOrderDto(row, reviewed.has(row.documentGuideId)),
    );
  }

  async findAllAdmin(query: OrderAdminQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.statusPayment = query.status;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        {
          documentGuide: {
            titleId: { contains: search, mode: "insensitive" },
          },
        },
        {
          documentGuide: {
            titleEn: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, email: true } },
          documentGuide: { select: orderGuideSelect },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: rows.map((row) => new ResponseAdminOrderDto(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
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
    const review = await this.prisma.review.findUnique({
      where: {
        userId_documentGuideId: {
          userId,
          documentGuideId: order.documentGuideId,
        },
      },
      select: { id: true },
    });
    return new ResponseOrderDto(order, Boolean(review));
  }

  async syncPaymentStatus(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    if (!order.gatewayTransactionId && !order.paymentUrl) {
      throw new BadRequestException(ErrorMessages.ORDER_PAYMENT_NOT_INITIATED);
    }

    const status = await this.fetchMidtransStatus(order.id);
    const updated = await this.applyPaymentStatus(
      order.id,
      status.transaction_status ?? "pending",
      {
        gatewayTransactionId:
          status.transaction_id ?? order.gatewayTransactionId,
        fraudStatus: status.fraud_status,
      },
    );
    return new ResponseOrderDto(updated);
  }

  async syncPaymentStatusAdmin(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    if (!order.gatewayTransactionId && !order.paymentUrl) {
      throw new BadRequestException(ErrorMessages.ORDER_PAYMENT_NOT_INITIATED);
    }

    const status = await this.fetchMidtransStatus(order.id);
    await this.applyPaymentStatus(
      order.id,
      status.transaction_status ?? "pending",
      {
        gatewayTransactionId:
          status.transaction_id ?? order.gatewayTransactionId,
        fraudStatus: status.fraud_status,
      },
    );
    const row = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, email: true } },
        documentGuide: { select: orderGuideSelect },
      },
    });
    if (!row) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    return new ResponseAdminOrderDto(row);
  }

  /**
   * Midtrans HTTP notification. Idempotent — safe to retry.
   */
  async handleMidtransNotification(payload: Record<string, unknown>) {
    const orderId = this.readWebhookField(payload, "order_id");
    const transactionStatus = this.readWebhookField(
      payload,
      "transaction_status",
    );
    const transactionId = this.readWebhookField(payload, "transaction_id");
    const fraudStatus = this.readWebhookField(payload, "fraud_status");

    if (!orderId || !transactionStatus) {
      throw new BadRequestException("Invalid Midtrans notification payload");
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { ok: true, ignored: true, reason: "order_not_found" };
    }

    const updated = await this.applyPaymentStatus(order.id, transactionStatus, {
      gatewayTransactionId: transactionId ?? order.gatewayTransactionId,
      fraudStatus,
    });

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

  private toMidtransAmount(price: Prisma.Decimal): number {
    return Math.round(price.toNumber());
  }

  /**
   * Blocks duplicate checkout: one PAID per user+guide, resume active PENDING.
   * Syncs stale PENDING with Midtrans so expired payments allow a new order.
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

    if (!order.gatewayTransactionId && !order.paymentUrl) {
      return order;
    }

    try {
      const status = await this.fetchMidtransStatus(order.id);
      const nextStatus = this.mapMidtransStatus(
        status.transaction_status,
        status.fraud_status,
      );

      if (nextStatus === order.statusPayment) {
        return order;
      }

      return this.applyPaymentStatus(
        order.id,
        status.transaction_status ?? "pending",
        {
          gatewayTransactionId:
            status.transaction_id ?? order.gatewayTransactionId,
          fraudStatus: status.fraud_status,
        },
      );
    } catch (err) {
      this.logger.warn(
        `Midtrans status check failed for order ${order.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return order;
    }
  }

  private async fetchMidtransStatus(
    orderId: string,
  ): Promise<MidtransTransactionStatus> {
    try {
      return await this.midtrans.getTransactionStatus(orderId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Snap token created but payment not started yet — treat as pending.
      if (/404|not found|Transaction doesn't exist/i.test(message)) {
        return { order_id: orderId, transaction_status: "pending" };
      }
      throw err;
    }
  }

  private async applyPaymentStatus(
    orderId: string,
    transactionStatus: string,
    opts?: {
      gatewayTransactionId?: string | null;
      fraudStatus?: string | null;
    },
  ) {
    const nextStatus = this.mapMidtransStatus(
      transactionStatus,
      opts?.fraudStatus,
    );
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
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
        `Guide email not sent for order ${orderId} (check Hostinger Mail API/logs)`,
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

  private mapMidtransStatus(
    transactionStatus?: string | null,
    fraudStatus?: string | null,
  ): StatusPayment {
    const status = (transactionStatus ?? "").toLowerCase();
    const fraud = (fraudStatus ?? "").toLowerCase();

    if (status === "capture") {
      if (fraud === "challenge") {
        return StatusPayment.PENDING;
      }
      if (fraud === "accept" || !fraud) {
        return StatusPayment.PAID;
      }
      return StatusPayment.FAILED;
    }

    switch (status) {
      case "settlement":
        return StatusPayment.PAID;
      case "pending":
        return StatusPayment.PENDING;
      case "deny":
      case "failure":
        return StatusPayment.FAILED;
      case "cancel":
      case "expire":
        return StatusPayment.CANCELED;
      case "refund":
      case "partial_refund":
        return StatusPayment.CANCELED;
      default:
        return StatusPayment.PENDING;
    }
  }

  private isPaymentBypassEnabled(): boolean {
    return process.env.PAYMENT_BYPASS?.trim().toLowerCase() === "true";
  }
}
