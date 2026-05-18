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
import { CityService } from "./city.service";
import { CreateCityDto } from "./dto/create-city.dto";
import { UpdateCityDto } from "./dto/update-city.dto";
import { JwtGuard } from "../auth/guard/jwt.guard";
import { RoleGuard } from "../auth/guard/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RoleEnums } from "../common/enum/role.enum";
import { PaginationSearchQueryDto } from "../common/dto/pagination-search-query.dto";

@UseGuards(JwtGuard, RoleGuard)
@Roles(RoleEnums.ADMIN)
@Controller("city")
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @Post()
  create(@Body() createCityDto: CreateCityDto) {
    return this.cityService.create(createCityDto);
  }

  @Get()
  findAll(@Query() query: PaginationSearchQueryDto) {
    return this.cityService.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id") id: number) {
    return this.cityService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: number, @Body() updateCityDto: UpdateCityDto) {
    return this.cityService.update(id, updateCityDto);
  }

  @Delete(":id")
  remove(@Param("id") id: number) {
    return this.cityService.remove(id);
  }
}
