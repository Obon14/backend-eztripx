import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { LegalSlug, Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ErrorMessages } from "../common/constants/message.constants";
import { UpdateLegalDocumentDto } from "./dto/update-legal-document.dto";
import {
  ResponseAdminLegalDto,
  ResponsePublicLegalDto,
} from "./dto/response-legal-document.dto";

@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  parseSlug(raw: string): LegalSlug {
    if (raw === LegalSlug.terms || raw === LegalSlug.privacy) {
      return raw;
    }
    throw new BadRequestException(ErrorMessages.LEGAL_INVALID_SLUG);
  }

  async findPublic(rawSlug: string, locale: "id" | "en" = "id") {
    const slug = this.parseSlug(rawSlug);
    const row = await this.prisma.legalDocument.findUnique({ where: { slug } });
    if (!row) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    return new ResponsePublicLegalDto(row, locale);
  }

  async findAllAdmin() {
    const rows = await this.prisma.legalDocument.findMany({
      orderBy: { slug: "asc" },
    });
    return rows.map((row) => new ResponseAdminLegalDto(row));
  }

  async findOneAdmin(rawSlug: string) {
    const slug = this.parseSlug(rawSlug);
    const row = await this.prisma.legalDocument.findUnique({ where: { slug } });
    if (!row) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    return new ResponseAdminLegalDto(row);
  }

  async update(rawSlug: string, dto: UpdateLegalDocumentDto) {
    const slug = this.parseSlug(rawSlug);
    const existing = await this.prisma.legalDocument.findUnique({
      where: { slug },
    });
    if (!existing) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }

    const data: Prisma.LegalDocumentUpdateInput = {};
    if (dto.titleId !== undefined) data.titleId = dto.titleId.trim();
    if (dto.titleEn !== undefined) data.titleEn = dto.titleEn.trim();
    if (dto.titleHighlightId !== undefined) {
      data.titleHighlightId = dto.titleHighlightId.trim();
    }
    if (dto.titleHighlightEn !== undefined) {
      data.titleHighlightEn = dto.titleHighlightEn.trim();
    }
    if (dto.introId !== undefined) data.introId = dto.introId.trim();
    if (dto.introEn !== undefined) data.introEn = dto.introEn.trim();
    if (dto.bodyId !== undefined) data.bodyId = dto.bodyId.trim();
    if (dto.bodyEn !== undefined) data.bodyEn = dto.bodyEn.trim();

    const emptied = Object.entries(data).find(([, value]) => value === "");
    if (emptied) {
      throw new BadRequestException(`${emptied[0]} cannot be empty`);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(ErrorMessages.LEGAL_NOTHING_TO_UPDATE);
    }

    const row = await this.prisma.legalDocument.update({
      where: { slug },
      data,
    });
    return new ResponseAdminLegalDto(row);
  }
}
