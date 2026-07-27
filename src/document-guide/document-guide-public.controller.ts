import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  StreamableFile,
} from "@nestjs/common";
import type { Response } from "express";
import { DocumentGuideService } from "./document-guide.service";
import { PublicDocumentGuideQueryDto } from "./dto/public-document-guide-query.dto";

@Controller("document-guide/public")
export class DocumentGuidePublicController {
  constructor(private readonly documentGuideService: DocumentGuideService) {}

  @Get()
  findAll(@Query() query: PublicDocumentGuideQueryDto) {
    return this.documentGuideService.findAllPublic(query);
  }

  @Get(":id/cover/:imageId")
  async coverById(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("imageId", ParseUUIDPipe) imageId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, filename, contentType } =
      await this.documentGuideService.getCoverStreamByImageId(id, imageId);
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(filename)}"`,
    );
    return new StreamableFile(stream);
  }

  @Get(":id/cover")
  async coverLegacy(
    @Param("id", ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, filename, contentType } =
      await this.documentGuideService.getFirstCoverStream(id);
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(filename)}"`,
    );
    return new StreamableFile(stream);
  }

  /** Public PDF preview (no auth). Truncated server-side when previewMode=hide. */
  @Get(":id/preview")
  async preview(
    @Param("id", ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, filename, limited } =
      await this.documentGuideService.getPublicPreviewStream(id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(filename)}"`,
    );
    res.setHeader(
      "Cache-Control",
      limited ? "private, no-store" : "public, max-age=300",
    );
    return new StreamableFile(stream);
  }

  @Get(":id")
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("locale") locale?: "id" | "en",
  ) {
    return this.documentGuideService.findOnePublic(id, locale);
  }
}
