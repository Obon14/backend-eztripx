import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ReviewStatus } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { OrderService } from "../order/order.service";
import { ErrorMessages } from "../common/constants/message.constants";
import { PaginationSearchQueryDto } from "../common/dto/pagination-search-query.dto";
import { CreateReviewDto } from "./dto/create-review.dto";
import {
  ResponsePublicReviewDto,
  ResponseReviewDto,
} from "./dto/response-review.dto";

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
  ) {}

  async create(userId: string, role: string, dto: CreateReviewDto) {
    await this.orderService.assertUserCanAccessGuide(
      dto.documentGuideId,
      userId,
      role,
    );

    const existing = await this.prisma.review.findUnique({
      where: {
        userId_documentGuideId: {
          userId,
          documentGuideId: dto.documentGuideId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(ErrorMessages.REVIEW_ALREADY_EXISTS);
    }

    const displayName = dto.displayName.trim();
    const comment = dto.comment.trim();
    if (!displayName || !comment) {
      throw new BadRequestException(ErrorMessages.REVIEW_COMMENT_REQUIRED);
    }

    const row = await this.prisma.review.create({
      data: {
        userId,
        documentGuideId: dto.documentGuideId,
        rating: dto.rating,
        comment,
        displayName,
        travelerRole: dto.travelerRole?.trim() || null,
        status: ReviewStatus.pending,
      },
    });
    return new ResponseReviewDto(row);
  }

  async findPublished() {
    const rows = await this.prisma.review.findMany({
      where: { status: ReviewStatus.published },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return rows.map((row) => new ResponsePublicReviewDto(row));
  }

  async findMineForGuide(userId: string, documentGuideId: string) {
    if (!documentGuideId?.trim()) return null;
    const row = await this.prisma.review.findUnique({
      where: {
        userId_documentGuideId: { userId, documentGuideId },
      },
    });
    return row ? new ResponseReviewDto(row) : null;
  }

  async findAllAdmin(query: PaginationSearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = search
      ? {
          OR: [
            { comment: { contains: search, mode: "insensitive" } },
            { displayName: { contains: search, mode: "insensitive" } },
            { user: { email: { contains: search, mode: "insensitive" } } },
            {
              documentGuide: {
                titleId: { contains: search, mode: "insensitive" },
              },
            },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { email: true } },
          documentGuide: { select: { titleId: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: rows.map((row) => new ResponseReviewDto(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async updateStatus(id: string, status: ReviewStatus) {
    const existing = await this.prisma.review.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    const row = await this.prisma.review.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { email: true } },
        documentGuide: { select: { titleId: true } },
      },
    });
    return new ResponseReviewDto(row);
  }
}
