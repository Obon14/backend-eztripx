import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { LegalService } from "./legal.service";
import { PrismaService } from "../prisma/prisma.service";
import { ErrorMessages } from "../common/constants/message.constants";

describe("LegalService", () => {
  let service: LegalService;
  const prisma = {
    legalDocument: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const row = {
    id: "doc-1",
    slug: "terms",
    titleId: "Syarat &",
    titleEn: "Terms &",
    titleHighlightId: "Ketentuan",
    titleHighlightEn: "Agreements",
    introId: "Intro ID",
    introEn: "Intro EN",
    bodyId: "## Satu",
    bodyEn: "## One",
    createdAt: new Date("2026-08-19T00:00:00.000Z"),
    updatedAt: new Date("2026-08-19T00:00:00.000Z"),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(LegalService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("rejects an invalid slug", async () => {
    await expect(service.findPublic("about", "id")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("maps English fields for the public payload", async () => {
    prisma.legalDocument.findUnique.mockResolvedValue(row);
    const dto = await service.findPublic("terms", "en");
    expect(dto.title).toBe("Terms &");
    expect(dto.titleHighlight).toBe("Agreements");
    expect(dto.body).toBe("## One");
  });

  it("throws when the document is missing", async () => {
    prisma.legalDocument.findUnique.mockResolvedValue(null);
    await expect(service.findPublic("terms", "id")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("rejects an empty update", async () => {
    prisma.legalDocument.findUnique.mockResolvedValue(row);
    await expect(service.update("terms", {})).rejects.toMatchObject({
      message: ErrorMessages.LEGAL_NOTHING_TO_UPDATE,
    });
  });
});
