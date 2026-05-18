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
import { CountryService } from "./country.service";
import { CreateCountryDto } from "./dto/create-country.dto";
import { UpdateCountryDto } from "./dto/update-country.dto";
import { JwtGuard } from "../auth/guard/jwt.guard";
import { RoleGuard } from "../auth/guard/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RoleEnums } from "../common/enum/role.enum";
import { PaginationSearchQueryDto } from "../common/dto/pagination-search-query.dto";

@UseGuards(JwtGuard, RoleGuard)
@Roles(RoleEnums.ADMIN)
@Controller("country")
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Post()
  create(@Body() createCountryDto: CreateCountryDto) {
    return this.countryService.create(createCountryDto);
  }

  @Get()
  findAll(@Query() query: PaginationSearchQueryDto) {
    return this.countryService.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id") id: number) {
    return this.countryService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: number, @Body() updateCountryDto: UpdateCountryDto) {
    return this.countryService.update(id, updateCountryDto);
  }

  @Delete(":id")
  remove(@Param("id") id: number) {
    return this.countryService.remove(id);
  }
}
