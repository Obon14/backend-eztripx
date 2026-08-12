import { Test, TestingModule } from "@nestjs/testing";
import { DocumentGuideService } from "./document-guide.service";
import { PrismaService } from "../prisma/prisma.service";
import { GeoCoordsService } from "../geo/geo-coords.service";

describe("DocumentGuideService", () => {
  let service: DocumentGuideService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentGuideService,
        {
          provide: PrismaService,
          useValue: {
            documentGuide: {},
            tagDocumentDestination: {},
            order: {},
            region: {},
            country: {},
            city: {},
            $transaction: jest.fn((arg: unknown) =>
              typeof arg === "function"
                ? arg({
                    tagDocumentDestination: { deleteMany: jest.fn() },
                    documentGuide: { update: jest.fn(), delete: jest.fn() },
                  })
                : Promise.all((arg as Promise<unknown>[]).map((p) => p)),
            ),
          },
        },
        {
          provide: GeoCoordsService,
          useValue: {
            ensureCoordsForTagRefs: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentGuideService>(DocumentGuideService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
