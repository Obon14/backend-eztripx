import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { LegalService } from "./legal.service";
import { UpdateLegalDocumentDto } from "./dto/update-legal-document.dto";
import { JwtGuard } from "../auth/guard/jwt.guard";
import { RoleGuard } from "../auth/guard/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RoleEnums } from "../common/enum/role.enum";

@UseGuards(JwtGuard, RoleGuard)
@Roles(RoleEnums.ADMIN)
@Controller("legal/admin")
export class LegalAdminController {
  constructor(private readonly legalService: LegalService) {}

  @Get()
  findAll() {
    return this.legalService.findAllAdmin();
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.legalService.findOneAdmin(slug);
  }

  @Patch(":slug")
  update(@Param("slug") slug: string, @Body() dto: UpdateLegalDocumentDto) {
    return this.legalService.update(slug, dto);
  }
}
