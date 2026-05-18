import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { RegionService } from "./region.service";
import { CreateRegionDto } from "./dto/create-region.dto";
import { UpdateRegionDto } from "./dto/update-region.dto";
import { JwtGuard } from "../auth/guard/jwt.guard";
import { RoleGuard } from "../auth/guard/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RoleEnums } from "../common/enum/role.enum";
import { PaginationSearchQueryDto } from "../common/dto/pagination-search-query.dto";

@UseGuards(JwtGuard, RoleGuard)
@Roles(RoleEnums.ADMIN)
@Controller("region")
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Post()
  create(@Body() createRegionDto: CreateRegionDto) {
    return this.regionService.create(createRegionDto);
  }

  @Get()
  findAll(@Query() query: PaginationSearchQueryDto) {
    return this.regionService.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id") id: number) {
    return this.regionService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: number, @Body() updateRegionDto: UpdateRegionDto) {
    return this.regionService.update(id, updateRegionDto);
  }

  @Delete(":id")
  remove(@Param("id") id: number) {
    return this.regionService.remove(id);
  }
}
