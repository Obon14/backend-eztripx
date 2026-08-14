import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { DocumentGuideService } from "./document-guide.service";
import { DocumentGuideIngestGuard } from "./guard/document-guide-ingest.guard";
import {
  documentGuideMulterDiskStorage,
  getMaxCoverImages,
} from "./document-guide.storage";
import { DocumentGuideIngestThrottle } from "../common/constants/throttle.constants";

/**
 * Machine REST create (static API key, no JWT / web login).
 * POST /api/document-guides — multipart. Distinct from admin `/document-guide`.
 */
@Controller("api/document-guides")
@UseGuards(ThrottlerGuard, DocumentGuideIngestGuard)
export class DocumentGuideIngestController {
  constructor(private readonly documentGuideService: DocumentGuideService) {}

  @Post()
  @Throttle(DocumentGuideIngestThrottle.create)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "document", maxCount: 1 },
        { name: "coverImages", maxCount: getMaxCoverImages() },
      ],
      { storage: documentGuideMulterDiskStorage() },
    ),
  )
  create(
    @UploadedFiles()
    files: {
      document?: Express.Multer.File[];
      coverImages?: Express.Multer.File[];
    },
    @Body() body: Record<string, string>,
  ) {
    return this.documentGuideService.create(
      files.document?.[0],
      files.coverImages ?? [],
      body,
    );
  }
}
