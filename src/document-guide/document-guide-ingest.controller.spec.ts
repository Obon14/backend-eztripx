import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { DocumentGuideIngestController } from "./document-guide-ingest.controller";
import { DocumentGuideService } from "./document-guide.service";
import { DocumentGuideIngestGuard } from "./guard/document-guide-ingest.guard";

describe("DocumentGuideIngestController", () => {
  let controller: DocumentGuideIngestController;
  let service: { create: jest.Mock };

  beforeEach(async () => {
    service = { create: jest.fn().mockResolvedValue({ id: "guide-1" }) };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
      controllers: [DocumentGuideIngestController],
      providers: [
        { provide: DocumentGuideService, useValue: service },
        {
          provide: ConfigService,
          useValue: { get: () => "test-ingest-key" },
        },
        DocumentGuideIngestGuard,
      ],
    }).compile();

    controller = module.get(DocumentGuideIngestController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("delegates create to DocumentGuideService", async () => {
    const document = { originalname: "a.pdf" } as Express.Multer.File;
    const covers = [{ originalname: "c.jpg" }] as Express.Multer.File[];
    const body = { titleId: "Bali" };

    await expect(
      controller.create({ document: [document], coverImages: covers }, body),
    ).resolves.toEqual({ id: "guide-1" });

    expect(service.create).toHaveBeenCalledWith(document, covers, body);
  });
});
