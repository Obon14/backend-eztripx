import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { DocumentGuideService } from "./document-guide.service";
import { documentGuideMulterDiskStorage } from "./document-guide.storage";
import { JwtGuard } from "../auth/guard/jwt.guard";
import { RoleGuard } from "../auth/guard/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RoleEnums } from "../common/enum/role.enum";
import { PaginationSearchQueryDto } from "../common/dto/pagination-search-query.dto";
import { OrderService } from "../order/order.service";
import { GetUser } from "../common/decorators/get-user.decorator";
import { RegisterResponseDto } from "../auth/dto/register-response.dto";

@UseGuards(JwtGuard, RoleGuard)
@Controller("document-guide")
export class DocumentGuideController {
  constructor(
    private readonly documentGuideService: DocumentGuideService,
    private readonly orderService: OrderService,
  ) {}

  @Post()
  @Roles(RoleEnums.ADMIN)
  @UseInterceptors(
    FileInterceptor("document", {
      storage: documentGuideMulterDiskStorage(),
    }),
  )
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, string>,
  ) {
    return this.documentGuideService.create(file, body);
  }

  @Get()
  findAll(@Query() query: PaginationSearchQueryDto) {
    return this.documentGuideService.findAll(query);
  }

  @Get(":id/preview")
  async preview(
    @Param("id", ParseUUIDPipe) id: string,
    @GetUser() user: RegisterResponseDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.orderService.assertUserCanAccessGuide(
      id,
      user.id,
      String(user.role),
    );
    const { stream, filename } =
      await this.documentGuideService.getPreviewStream(id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(filename)}"`,
    );
    return new StreamableFile(stream);
  }

  @Get(":id/download")
  async download(
    @Param("id", ParseUUIDPipe) id: string,
    @GetUser() user: RegisterResponseDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.orderService.assertUserCanAccessGuide(
      id,
      user.id,
      String(user.role),
    );
    const { stream, filename } =
      await this.documentGuideService.getPreviewStream(id);
    const asciiFallback =
      filename.replace(/[^\x20-\x7E]/g, "_") || "document.pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    return new StreamableFile(stream);
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.documentGuideService.findOne(id);
  }

  @Patch(":id")
  @Roles(RoleEnums.ADMIN)
  @UseInterceptors(
    FileInterceptor("document", {
      storage: documentGuideMulterDiskStorage(),
    }),
  )
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: Record<string, string>,
  ) {
    return this.documentGuideService.update(id, file, body);
  }

  @Delete(":id")
  @Roles(RoleEnums.ADMIN)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.documentGuideService.remove(id);
  }
}
