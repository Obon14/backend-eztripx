import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  ErrorMessages,
  SuccessMessages,
} from "../common/constants/message.constants";
import { PaginationSearchQueryDto } from "../common/dto/pagination-search-query.dto";
import { CreateDocumentGuideDto } from "./dto/create-document-guide.dto";
import { UpdateDocumentGuideDto } from "./dto/update-document-guide.dto";
import { TagDocumentDestinationItemDto } from "./dto/tag-document-destination-item.dto";
import { ResponseListDocumentGuideDto } from "./dto/response-list-document-guide.dto";
import { ResponseDetailDocumentGuideDto } from "./dto/response-detail-document-guide.dto";
import {
  assertPdfFile,
  clearGuideDirectory,
  createPdfReadStream,
  moveTempFileToGuideFolder,
  removeGuideDirectory,
  sanitizePdfBasename,
} from "./document-guide.storage";
import type { ReadStream } from "node:fs";

@Injectable()
export class DocumentGuideService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    file: Express.Multer.File,
    body: Record<string, string | undefined>,
  ) {
    if (!file) {
      throw new BadRequestException(ErrorMessages.INVALID_FILE_FORMAT);
    }
    await assertPdfFile(file);
    const dto = await this.parseAndValidateCreateBody(body);
    await this.assertTitleUnique(dto.title.trim());
    await this.assertTagsConsistent(dto.tags);

    const nameDocument = sanitizePdfBasename(file.originalname);

    const guide = await this.prisma.documentGuide.create({
      data: {
        title: dto.title.trim(),
        nameDocument,
        priceIdr: this.toDecimalOrNull(dto.priceIdr),
        priceUsd: this.toDecimalOrNull(dto.priceUsd),
        tagDocumentDestination: {
          create: dto.tags.map((t) => ({
            regionId: t.regionId,
            countryId: t.countryId ?? null,
            cityId: t.cityId ?? null,
          })),
        },
      },
    });

    try {
      await moveTempFileToGuideFolder(file.path, guide.id, nameDocument);
    } catch (err) {
      await this.prisma.tagDocumentDestination.deleteMany({
        where: { documentGuideId: guide.id },
      });
      await this.prisma.documentGuide.delete({ where: { id: guide.id } });
      throw err;
    }

    return this.findOne(guide.id);
  }

  async findAll(query: PaginationSearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentGuideWhereInput = search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { nameDocument: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.documentGuide.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          tagDocumentDestination: {
            include: {
              region: { select: { id: true, name: true } },
              country: { select: { id: true, name: true } },
              city: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.documentGuide.count({ where }),
    ]);

    const data = rows.map((row) => new ResponseListDocumentGuideDto(row))

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string) {
    const row = await this.prisma.documentGuide.findUnique({
      where: { id },
      include: {
        tagDocumentDestination: {
          include: {
            region: { select: { id: true, name: true } },
            country: { select: { id: true, name: true } },
            city: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    return new ResponseDetailDocumentGuideDto(row);
  }

  async update(
    id: string,
    file: Express.Multer.File | undefined,
    body: Record<string, string | undefined>,
  ) {
    const existing = await this.prisma.documentGuide.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }

    const dto = await this.parseAndValidateUpdateBody(body);

    const hasBodyUpdate =
      dto.title !== undefined ||
      dto.priceIdr !== undefined ||
      dto.priceUsd !== undefined ||
      dto.tags !== undefined;
    if (!file && !hasBodyUpdate) {
      throw new BadRequestException(
        ErrorMessages.DOCUMENT_GUIDE_NOTHING_TO_UPDATE,
      );
    }

    const nextTitle = dto.title?.trim() ?? existing.title;
    if (dto.title !== undefined && nextTitle !== existing.title) {
      await this.assertTitleUnique(nextTitle, id);
    }

    if (dto.tags) {
      await this.assertTagsConsistent(dto.tags);
    }

    if (file) {
      await assertPdfFile(file);
    }

    const nameDocument = file
      ? sanitizePdfBasename(file.originalname)
      : existing.nameDocument;

    await this.prisma.$transaction(async (tx) => {
      if (dto.tags) {
        await tx.tagDocumentDestination.deleteMany({
          where: { documentGuideId: id },
        });
      }

      await tx.documentGuide.update({
        where: { id },
        data: {
          title: dto.title !== undefined ? nextTitle : undefined,
          nameDocument: file ? nameDocument : undefined,
          priceIdr:
            dto.priceIdr !== undefined
              ? this.toDecimalOrNull(dto.priceIdr)
              : undefined,
          priceUsd:
            dto.priceUsd !== undefined
              ? this.toDecimalOrNull(dto.priceUsd)
              : undefined,
          ...(dto.tags
            ? {
                tagDocumentDestination: {
                  create: dto.tags.map((t) => ({
                    regionId: t.regionId,
                    countryId: t.countryId ?? null,
                    cityId: t.cityId ?? null,
                  })),
                },
              }
            : {}),
        },
      });
    });

    if (file) {
      await clearGuideDirectory(id);
      await moveTempFileToGuideFolder(file.path, id, nameDocument);
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const existing = await this.prisma.documentGuide.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }

    const orderCount = await this.prisma.order.count({
      where: { documentGuideId: id },
    });
    if (orderCount > 0) {
      throw new ConflictException(ErrorMessages.DOCUMENT_GUIDE_HAS_ORDERS);
    }

    await this.prisma.$transaction([
      this.prisma.tagDocumentDestination.deleteMany({
        where: { documentGuideId: id },
      }),
      this.prisma.documentGuide.delete({ where: { id } }),
    ]);

    await removeGuideDirectory(id);

    return { message: SuccessMessages.DELETE_SUCCESS };
  }

  async getPreviewStream(id: string): Promise<{
    stream: ReadStream;
    filename: string;
  }> {
    const guide = await this.prisma.documentGuide.findUnique({
      where: { id },
      select: { id: true, nameDocument: true },
    });
    if (!guide) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    const stream = createPdfReadStream(guide.id, guide.nameDocument);
    if (!stream) {
      throw new NotFoundException(ErrorMessages.DOCUMENT_GUIDE_FILE_NOT_FOUND);
    }
    return { stream, filename: guide.nameDocument };
  }

  private toDecimalOrNull(
    value: number | null | undefined,
  ): Prisma.Decimal | null {
    if (value === null || value === undefined) {
      return null;
    }
    return new Prisma.Decimal(value);
  }

  private parseTagsJson(raw: string | undefined): unknown {
    if (raw === undefined || raw === "") {
      throw new BadRequestException(ErrorMessages.DOCUMENT_GUIDE_TAGS_INVALID_JSON);
    }
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      throw new BadRequestException(ErrorMessages.DOCUMENT_GUIDE_TAGS_INVALID_JSON);
    }
  }

  private parseOptionalNumber(
    raw: string | undefined,
  ): number | null | undefined {
    if (raw === undefined) {
      return undefined;
    }
    if (raw.trim() === "") {
      return null;
    }
    const n = Number(raw);
    if (Number.isNaN(n)) {
      throw new BadRequestException(ErrorMessages.DOCUMENT_GUIDE_INVALID_PRICE);
    }
    return n;
  }

  private parseOptionalNumberForCreate(
    raw: string | undefined,
  ): number | undefined {
    if (raw === undefined) {
      return undefined;
    }
    if (raw.trim() === "") {
      return undefined;
    }
    const n = Number(raw);
    if (Number.isNaN(n)) {
      throw new BadRequestException(ErrorMessages.DOCUMENT_GUIDE_INVALID_PRICE);
    }
    return n;
  }

  private async parseAndValidateCreateBody(
    body: Record<string, string | undefined>,
  ): Promise<CreateDocumentGuideDto> {
    const tags = this.parseTagsJson(body.tags);
    const dto = plainToInstance(CreateDocumentGuideDto, {
      title: body.title,
      priceIdr: this.parseOptionalNumberForCreate(body.priceIdr),
      priceUsd: this.parseOptionalNumberForCreate(body.priceUsd),
      tags,
    });
    await validateOrReject(dto, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });
    return dto;
  }

  private async parseAndValidateUpdateBody(
    body: Record<string, string | undefined>,
  ): Promise<UpdateDocumentGuideDto> {
    const partial: Record<string, unknown> = {};
    if (body.title !== undefined) {
      partial.title = body.title;
    }
    if (body.priceIdr !== undefined) {
      partial.priceIdr = this.parseOptionalNumber(body.priceIdr);
    }
    if (body.priceUsd !== undefined) {
      partial.priceUsd = this.parseOptionalNumber(body.priceUsd);
    }
    if (body.tags !== undefined) {
      partial.tags = this.parseTagsJson(body.tags);
    }
    const dto = plainToInstance(UpdateDocumentGuideDto, partial);
    await validateOrReject(dto, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });
    if (dto.tags !== undefined && dto.tags.length < 1) {
      throw new BadRequestException(ErrorMessages.DOCUMENT_GUIDE_TAGS_REQUIRED);
    }
    return dto;
  }

  private async assertTitleUnique(title: string, excludeId?: string) {
    const found = await this.prisma.documentGuide.findFirst({
      where: {
        title: { equals: title, mode: "insensitive" },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (found) {
      throw new ConflictException(ErrorMessages.DOCUMENT_GUIDE_TITLE_EXISTS);
    }
  }

  private async assertTagsConsistent(tags: TagDocumentDestinationItemDto[]) {
    for (const t of tags) {
      const region = await this.prisma.region.findUnique({
        where: { id: t.regionId },
      });
      if (!region) {
        throw new BadRequestException(ErrorMessages.DOCUMENT_GUIDE_INVALID_TAG);
      }

      if (t.countryId != null) {
        const country = await this.prisma.country.findUnique({
          where: { id: t.countryId },
        });
        if (!country || country.regionId !== t.regionId) {
          throw new BadRequestException(ErrorMessages.DOCUMENT_GUIDE_INVALID_TAG);
        }
      }

      if (t.cityId != null) {
        const city = await this.prisma.city.findUnique({
          where: { id: t.cityId },
          include: { country: true },
        });
        if (!city) {
          throw new BadRequestException(ErrorMessages.DOCUMENT_GUIDE_INVALID_TAG);
        }
        if (t.countryId != null && city.countryId !== t.countryId) {
          throw new BadRequestException(ErrorMessages.DOCUMENT_GUIDE_INVALID_TAG);
        }
        if (t.countryId == null && city.country.regionId !== t.regionId) {
          throw new BadRequestException(ErrorMessages.DOCUMENT_GUIDE_INVALID_TAG);
        }
      }
    }
  }
}
