import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
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

const DEFAULT_INVOICE_DURATION_SEC = 86_400;

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xendit: XenditService,
  ) {}

  async create(userId: string, userEmail: string, dto: CreateOrderDto) {
    const guide = await this.prisma.documentGuide.findUnique({
      where: { id: dto.documentGuideId },
      select: {
        id: true,
        title: true,
        priceIdr: true,
        priceUsd: true,
      },
    });
    if (!guide) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
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
      const invoice = await this.xendit.createInvoice({
        externalId: order.id,
        amount: this.toXenditAmount(price, dto.currency),
        currency: dto.currency,
        description: guide.title,
        payerEmail: userEmail,
        invoiceDuration: DEFAULT_INVOICE_DURATION_SEC,
      });

      const updated = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          gatewayTransactionId: invoice.id ?? null,
          paymentUrl: invoice.invoiceUrl ?? null,
        },
        include: {
          documentGuide: { select: { id: true, title: true } },
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
        documentGuide: { select: { id: true, title: true } },
      },
    });
    return rows.map((row) => new ResponseOrderDto(row));
  }

  async findOneForUser(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        documentGuide: { select: { id: true, title: true } },
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
    const nextStatus = this.mapXenditStatus(invoice.status);

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        statusPayment: nextStatus,
        paidAt:
          nextStatus === StatusPayment.PAID
            ? (order.paidAt ?? new Date())
            : order.paidAt,
      },
      include: {
        documentGuide: { select: { id: true, title: true } },
      },
    });

    return new ResponseOrderDto(updated);
  }

  async assertUserCanAccessGuide(
    documentGuideId: string,
    userId: string,
    role: string,
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
