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
  assertCoverImageFile,
  assertPdfFile,
  createCoverReadStream,
  createPdfReadStream,
  getCoverContentType,
  getMaxCoverImages,
  moveTempCoverToGuideFolder,
  moveTempFileToGuideFolder,
  removeCoverFile,
  removeGuideDirectory,
  removeGuidePdfFile,
  sanitizePdfBasename,
} from "./document-guide.storage";
import { ResponsePublicDocumentGuideDto } from "./dto/response-public-document-guide.dto";
import { PublicDocumentGuideQueryDto } from "./dto/public-document-guide-query.dto";
import type { ReadStream } from "node:fs";

const guideInclude = {
  tagDocumentDestination: {
    include: {
      region: { select: { id: true, name: true } },
      country: { select: { id: true, name: true } },
      city: { select: { id: true, name: true } },
    },
  },
  coverImages: {
    orderBy: { sortOrder: "asc" as const },
  },
};

@Injectable()
export class DocumentGuideService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    documentFile: Express.Multer.File | undefined,
    coverFiles: Express.Multer.File[],
    body: Record<string, string | undefined>,
  ) {
    if (!documentFile) {
      throw new BadRequestException(ErrorMessages.INVALID_FILE_FORMAT);
    }
    await assertPdfFile(documentFile);
    for (const f of coverFiles) {
      await assertCoverImageFile(f);
    }
    if (coverFiles.length > getMaxCoverImages()) {
      throw new BadRequestException(
        `Maximum ${getMaxCoverImages()} cover images allowed`,
      );
    }

    const dto = await this.parseAndValidateCreateBody(body);
    await this.assertTitleIdUnique(dto.titleId.trim());
    await this.assertTagsConsistent(dto.tags);

    const nameDocument = sanitizePdfBasename(documentFile.originalname);

    const guide = await this.prisma.documentGuide.create({
      data: {
        titleId: dto.titleId.trim(),
        titleEn: dto.titleEn?.trim() || null,
        nameDocument,
        tripDays: dto.tripDays ?? null,
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
      await moveTempFileToGuideFolder(documentFile.path, guide.id, nameDocument);
      await this.saveCoverFiles(guide.id, coverFiles);
    } catch (err) {
      await this.prisma.tagDocumentDestination.deleteMany({
        where: { documentGuideId: guide.id },
      });
      await this.prisma.documentGuideImage.deleteMany({
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
            { titleId: { contains: search, mode: "insensitive" } },
            { titleEn: { contains: search, mode: "insensitive" } },
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
        include: guideInclude,
      }),
      this.prisma.documentGuide.count({ where }),
    ]);

    const data = rows.map((row) => new ResponseListDocumentGuideDto(row));

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
      include: guideInclude,
    });
    if (!row) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    return new ResponseDetailDocumentGuideDto(row);
  }

  async findAllPublic(query: PublicDocumentGuideQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();
    const skip = (page - 1) * limit;
    const locale = query.locale;

    const and: Prisma.DocumentGuideWhereInput[] = [];

    if (search) {
      and.push({
        OR: [
          { titleId: { contains: search, mode: "insensitive" } },
          { titleEn: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (query.tripDays != null) {
      and.push({ tripDays: query.tripDays });
    }

    const regionIds =
      query.regionIds ??
      (query.regionId != null ? [query.regionId] : undefined);
    const countryIds =
      query.countryIds ??
      (query.countryId != null ? [query.countryId] : undefined);
    const cityIds =
      query.cityIds ?? (query.cityId != null ? [query.cityId] : undefined);

    if (regionIds?.length) {
      and.push({
        tagDocumentDestination: {
          some: { regionId: { in: regionIds } },
        },
      });
    }
    if (countryIds?.length) {
      and.push({
        tagDocumentDestination: {
          some: { countryId: { in: countryIds } },
        },
      });
    }
    if (cityIds?.length) {
      and.push({
        tagDocumentDestination: {
          some: { cityId: { in: cityIds } },
        },
      });
    }

    const where: Prisma.DocumentGuideWhereInput =
      and.length > 0 ? { AND: and } : {};

    const [rows, total] = await Promise.all([
      this.prisma.documentGuide.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          tagDocumentDestination: {
            include: {
              region: { select: { name: true } },
              country: { select: { name: true } },
              city: { select: { name: true } },
            },
          },
          coverImages: { orderBy: { sortOrder: "asc" } },
        },
      }),
      this.prisma.documentGuide.count({ where }),
    ]);

    return {
      data: rows.map((row) => new ResponsePublicDocumentGuideDto(row, locale)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOnePublic(id: string, locale?: "id" | "en") {
    const row = await this.prisma.documentGuide.findUnique({
      where: { id },
      include: {
        tagDocumentDestination: {
          include: {
            region: { select: { name: true } },
            country: { select: { name: true } },
            city: { select: { name: true } },
          },
        },
        coverImages: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!row) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    return new ResponsePublicDocumentGuideDto(row, locale);
  }

  async getCoverStreamByImageId(
    guideId: string,
    imageId: string,
  ): Promise<{
    stream: ReadStream;
    filename: string;
    contentType: string;
  }> {
    const image = await this.prisma.documentGuideImage.findFirst({
      where: { id: imageId, documentGuideId: guideId },
    });
    if (!image) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    const stream = createCoverReadStream(guideId, image.filename);
    if (!stream) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    return {
      stream,
      filename: image.filename,
      contentType: getCoverContentType(image.filename),
    };
  }

  async getFirstCoverStream(guideId: string) {
    const first = await this.prisma.documentGuideImage.findFirst({
      where: { documentGuideId: guideId },
      orderBy: { sortOrder: "asc" },
    });
    if (!first) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    return this.getCoverStreamByImageId(guideId, first.id);
  }

  async update(
    id: string,
    documentFile: Express.Multer.File | undefined,
    coverFiles: Express.Multer.File[],
    body: Record<string, string | undefined>,
  ) {
    const existing = await this.prisma.documentGuide.findUnique({
      where: { id },
      include: { coverImages: true },
    });
    if (!existing) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }

    const dto = await this.parseAndValidateUpdateBody(body);

    for (const f of coverFiles) {
      await assertCoverImageFile(f);
    }

    const removeCoverIds = this.parseRemoveCoverIds(body.removeCoverIds);
    const nextCoverCount =
      existing.coverImages.length -
      removeCoverIds.length +
      coverFiles.length;
    if (nextCoverCount > getMaxCoverImages()) {
      throw new BadRequestException(
        `Maximum ${getMaxCoverImages()} cover images allowed`,
      );
    }

    const hasBodyUpdate =
      dto.titleId !== undefined ||
      dto.titleEn !== undefined ||
      dto.priceIdr !== undefined ||
      dto.priceUsd !== undefined ||
      dto.tripDays !== undefined ||
      dto.tags !== undefined ||
      removeCoverIds.length > 0;
    if (!documentFile && coverFiles.length === 0 && !hasBodyUpdate) {
      throw new BadRequestException(
        ErrorMessages.DOCUMENT_GUIDE_NOTHING_TO_UPDATE,
      );
    }

    const nextTitleId = dto.titleId?.trim() ?? existing.titleId;
    if (dto.titleId !== undefined && nextTitleId !== existing.titleId) {
      await this.assertTitleIdUnique(nextTitleId, id);
    }

    if (dto.tags) {
      await this.assertTagsConsistent(dto.tags);
    }

    if (documentFile) {
      await assertPdfFile(documentFile);
    }

    const nameDocument = documentFile
      ? sanitizePdfBasename(documentFile.originalname)
      : existing.nameDocument;

    await this.prisma.$transaction(async (tx) => {
      if (dto.tags) {
        await tx.tagDocumentDestination.deleteMany({
          where: { documentGuideId: id },
        });
      }

      if (removeCoverIds.length > 0) {
        const toRemove = existing.coverImages.filter((img) =>
          removeCoverIds.includes(img.id),
        );
        await tx.documentGuideImage.deleteMany({
          where: { id: { in: removeCoverIds }, documentGuideId: id },
        });
        for (const img of toRemove) {
          await removeCoverFile(id, img.filename);
        }
      }

      await tx.documentGuide.update({
        where: { id },
        data: {
          titleId: dto.titleId !== undefined ? nextTitleId : undefined,
          titleEn:
            dto.titleEn !== undefined
              ? dto.titleEn?.trim() || null
              : undefined,
          nameDocument: documentFile ? nameDocument : undefined,
          tripDays: dto.tripDays !== undefined ? dto.tripDays : undefined,
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

    if (documentFile) {
      await removeGuidePdfFile(id, existing.nameDocument);
      await moveTempFileToGuideFolder(documentFile.path, id, nameDocument);
    }

    if (coverFiles.length > 0) {
      await this.saveCoverFiles(id, coverFiles);
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const existing = await this.prisma.documentGuide.findUnique({
      where: { id },
      include: { coverImages: true },
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
      this.prisma.documentGuideImage.deleteMany({
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

  private async saveCoverFiles(
    guideId: string,
    coverFiles: Express.Multer.File[],
  ) {
    if (coverFiles.length === 0) return;

    const maxSort = await this.prisma.documentGuideImage.aggregate({
      where: { documentGuideId: guideId },
      _max: { sortOrder: true },
    });
    let sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    for (const file of coverFiles) {
      const filename = file.filename;
      await moveTempCoverToGuideFolder(file.path, guideId, filename);
      await this.prisma.documentGuideImage.create({
        data: {
          documentGuideId: guideId,
          filename,
          sortOrder: sortOrder++,
        },
      });
    }
  }

  private parseRemoveCoverIds(raw: string | undefined): string[] {
    if (raw === undefined || raw.trim() === "") return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((id): id is string => typeof id === "string");
    } catch {
      return [];
    }
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

  private parseOptionalInt(raw: string | undefined): number | null | undefined {
    if (raw === undefined) {
      return undefined;
    }
    if (raw.trim() === "") {
      return null;
    }
    const n = Number(raw);
    if (!Number.isInteger(n) || Number.isNaN(n)) {
      throw new BadRequestException("Invalid trip days value");
    }
    return n;
  }

  private parseOptionalIntForCreate(
    raw: string | undefined,
  ): number | undefined {
    if (raw === undefined || raw.trim() === "") {
      return undefined;
    }
    const n = Number(raw);
    if (!Number.isInteger(n) || Number.isNaN(n)) {
      throw new BadRequestException("Invalid trip days value");
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
      titleId: body.titleId ?? body.title,
      titleEn: body.titleEn,
      priceIdr: this.parseOptionalNumberForCreate(body.priceIdr),
      priceUsd: this.parseOptionalNumberForCreate(body.priceUsd),
      tripDays: this.parseOptionalIntForCreate(body.tripDays),
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
    if (body.titleId !== undefined || body.title !== undefined) {
      partial.titleId = body.titleId ?? body.title;
    }
    if (body.titleEn !== undefined) {
      partial.titleEn = body.titleEn;
    }
    if (body.priceIdr !== undefined) {
      partial.priceIdr = this.parseOptionalNumber(body.priceIdr);
    }
    if (body.priceUsd !== undefined) {
      partial.priceUsd = this.parseOptionalNumber(body.priceUsd);
    }
    if (body.tripDays !== undefined) {
      partial.tripDays = this.parseOptionalInt(body.tripDays);
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

  private async assertTitleIdUnique(titleId: string, excludeId?: string) {
    const found = await this.prisma.documentGuide.findFirst({
      where: {
        titleId: { equals: titleId, mode: "insensitive" },
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
