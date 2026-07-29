import { Injectable } from "@nestjs/common";
import {
  DocumentGuideStatus,
  Role,
  StatusPayment,
} from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_PERIOD_DAYS = 7;
const RECENT_LIMIT = 8;
const TOP_GUIDES_LIMIT = 5;
const ATTENTION_LIMIT = 5;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(periodDays = DEFAULT_PERIOD_DAYS) {
    const days = Number.isFinite(periodDays) && periodDays > 0
      ? Math.min(Math.floor(periodDays), 90)
      : DEFAULT_PERIOD_DAYS;

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);

    const [
      revenueGroups,
      paidInPeriod,
      statusGroups,
      newUsers,
      publishedCount,
      draftCount,
      recentOrders,
      topGuideGroups,
      unpaidEmailOrders,
    ] = await Promise.all([
      this.prisma.order.groupBy({
        by: ["currency"],
        where: {
          statusPayment: StatusPayment.PAID,
          paidAt: { gte: since },
        },
        _sum: { price: true },
        _count: { _all: true },
      }),
      this.prisma.order.count({
        where: {
          statusPayment: StatusPayment.PAID,
          paidAt: { gte: since },
        },
      }),
      this.prisma.order.groupBy({
        by: ["statusPayment"],
        _count: { _all: true },
      }),
      this.prisma.user.count({
        where: {
          role: Role.USER,
          createdAt: { gte: since },
        },
      }),
      this.prisma.documentGuide.count({
        where: { status: DocumentGuideStatus.published },
      }),
      this.prisma.documentGuide.count({
        where: { status: DocumentGuideStatus.draft },
      }),
      this.prisma.order.findMany({
        take: RECENT_LIMIT,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, email: true } },
          documentGuide: {
            select: { id: true, titleId: true, titleEn: true },
          },
        },
      }),
      this.prisma.order.groupBy({
        by: ["documentGuideId"],
        where: { statusPayment: StatusPayment.PAID },
        _count: { _all: true },
        orderBy: { _count: { documentGuideId: "desc" } },
        take: TOP_GUIDES_LIMIT,
      }),
      this.prisma.order.findMany({
        where: {
          statusPayment: StatusPayment.PAID,
          emailDeliveredAt: null,
        },
        take: ATTENTION_LIMIT,
        orderBy: { paidAt: "desc" },
        include: {
          user: { select: { email: true } },
          documentGuide: {
            select: { id: true, titleId: true, titleEn: true },
          },
        },
      }),
    ]);

    const revenueByCurrency: Record<string, string> = {};
    for (const row of revenueGroups) {
      revenueByCurrency[row.currency] = (row._sum.price ?? 0).toString();
    }

    const orderCounts: Record<StatusPayment, number> = {
      PENDING: 0,
      PAID: 0,
      FAILED: 0,
      CANCELED: 0,
    };
    for (const row of statusGroups) {
      orderCounts[row.statusPayment] = row._count._all;
    }

    const topGuideIds = topGuideGroups.map((g) => g.documentGuideId);
    const topGuideRows =
      topGuideIds.length === 0
        ? []
        : await this.prisma.documentGuide.findMany({
            where: { id: { in: topGuideIds } },
            select: { id: true, titleId: true, titleEn: true },
          });
    const topGuideMap = new Map(topGuideRows.map((g) => [g.id, g]));

    const topGuides = topGuideGroups
      .map((g) => {
        const guide = topGuideMap.get(g.documentGuideId);
        if (!guide) return null;
        return {
          id: guide.id,
          titleId: guide.titleId,
          titleEn: guide.titleEn,
          paidCount: g._count._all,
        };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);

    return {
      periodDays: days,
      since: since.toISOString(),
      kpis: {
        revenueIdr: revenueByCurrency.IDR ?? "0",
        revenueUsd: revenueByCurrency.USD ?? "0",
        paidOrders: paidInPeriod,
        pendingOrders: orderCounts.PENDING,
        newUsers,
      },
      orderCounts,
      catalog: {
        published: publishedCount,
        draft: draftCount,
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        price: o.price.toString(),
        currency: o.currency,
        statusPayment: o.statusPayment,
        paidAt: o.paidAt,
        emailDeliveredAt: o.emailDeliveredAt,
        createdAt: o.createdAt,
        user: { id: o.user.id, email: o.user.email },
        documentGuide: {
          id: o.documentGuide.id,
          titleId: o.documentGuide.titleId,
          titleEn: o.documentGuide.titleEn,
        },
      })),
      topGuides,
      attention: {
        unpaidEmail: unpaidEmailOrders.map((o) => ({
          id: o.id,
          paidAt: o.paidAt,
          userEmail: o.user.email,
          documentGuide: {
            id: o.documentGuide.id,
            titleId: o.documentGuide.titleId,
            titleEn: o.documentGuide.titleEn,
          },
        })),
        draftCount: draftCount,
        pendingCount: orderCounts.PENDING,
      },
    };
  }
}
