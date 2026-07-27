import { Test, TestingModule } from "@nestjs/testing";
import { DocumentGuideController } from "./document-guide.controller";
import { DocumentGuideService } from "./document-guide.service";
import { OrderService } from "../order/order.service";

describe("DocumentGuideController", () => {
  let controller: DocumentGuideController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentGuideController],
      providers: [
        {
          provide: DocumentGuideService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            getPreviewStream: jest.fn(),
            getPublicPreviewStream: jest.fn(),
          },
        },
        {
          provide: OrderService,
          useValue: {
            assertUserCanAccessGuide: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DocumentGuideController>(DocumentGuideController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
