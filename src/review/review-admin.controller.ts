import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ReviewService } from "./review.service";
import { UpdateReviewStatusDto } from "./dto/update-review-status.dto";
import { PaginationSearchQueryDto } from "../common/dto/pagination-search-query.dto";
import { JwtGuard } from "../auth/guard/jwt.guard";
import { RoleGuard } from "../auth/guard/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RoleEnums } from "../common/enum/role.enum";

@UseGuards(JwtGuard, RoleGuard)
@Roles(RoleEnums.ADMIN)
@Controller("review/admin")
export class ReviewAdminController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  findAll(@Query() query: PaginationSearchQueryDto) {
    return this.reviewService.findAllAdmin(query);
  }

  @Patch(":id")
  updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewStatusDto,
  ) {
    return this.reviewService.updateStatus(id, dto.status);
  }
}
