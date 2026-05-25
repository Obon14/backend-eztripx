import { Controller, Get, Query } from "@nestjs/common";
import { GeoPublicService } from "./geo-public.service";
import { PaginationSearchQueryDto } from "../common/dto/pagination-search-query.dto";
import { GeoCountryQueryDto } from "./dto/geo-country-query.dto";
import { GeoCityQueryDto } from "./dto/geo-city-query.dto";

@Controller("geo/public")
export class GeoPublicController {
  constructor(private readonly geoPublicService: GeoPublicService) {}

  @Get("region")
  findRegions(@Query() query: PaginationSearchQueryDto) {
    return this.geoPublicService.findRegions(query);
  }

  @Get("country")
  findCountries(@Query() query: GeoCountryQueryDto) {
    return this.geoPublicService.findCountries(query);
  }

  @Get("city")
  findCities(@Query() query: GeoCityQueryDto) {
    return this.geoPublicService.findCities(query);
  }
}
