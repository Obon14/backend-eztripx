import { Controller, Get, Param, Query } from "@nestjs/common";
import { LegalService } from "./legal.service";
import { PublicLegalQueryDto } from "./dto/public-legal-query.dto";

@Controller("legal/public")
export class LegalPublicController {
  constructor(private readonly legalService: LegalService) {}

  @Get(":slug")
  findOne(
    @Param("slug") slug: string,
    @Query() query: PublicLegalQueryDto,
  ) {
    return this.legalService.findPublic(slug, query.locale ?? "id");
  }
}
