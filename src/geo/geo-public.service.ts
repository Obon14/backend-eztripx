import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PaginationSearchQueryDto } from "../common/dto/pagination-search-query.dto";
import { GeoCountryQueryDto } from "./dto/geo-country-query.dto";
import { GeoCityQueryDto } from "./dto/geo-city-query.dto";
import { ResponseListRegionDto } from "../region/dto/response-list-region.dto";
import { ResponseListCountryDto } from "../country/dto/response-list-country.dto";
import { ResponseListCityDto } from "../city/dto/response-list-city.dto";

@Injectable()
export class GeoPublicService {
  constructor(private readonly prisma: PrismaService) {}

  async findRegions(query: PaginationSearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();
    const skip = (page - 1) * limit;

    const where: Prisma.RegionWhereInput = search
      ? { name: { contains: search, mode: "insensitive" } }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.region.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      this.prisma.region.count({ where }),
    ]);

    return {
      data: rows.map((row) => new ResponseListRegionDto(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findCountries(query: GeoCountryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();
    const skip = (page - 1) * limit;

    const regionIds =
      query.regionIds ??
      (query.regionId != null ? [query.regionId] : undefined);

    const where: Prisma.CountryWhereInput = {
      ...(regionIds?.length ? { regionId: { in: regionIds } } : {}),
      ...(search
        ? { name: { contains: search, mode: "insensitive" } }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.country.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: { region: { select: { id: true, name: true } } },
      }),
      this.prisma.country.count({ where }),
    ]);

    return {
      data: rows.map((row) => new ResponseListCountryDto(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findCities(query: GeoCityQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();
    const skip = (page - 1) * limit;

    const countryIds =
      query.countryIds ??
      (query.countryId != null ? [query.countryId] : undefined);
    const regionIds =
      query.regionIds ??
      (query.regionId != null ? [query.regionId] : undefined);

    // Prefer explicit countries; otherwise scope cities to countries in selected regions.
    const where: Prisma.CityWhereInput = {
      ...(countryIds?.length
        ? { countryId: { in: countryIds } }
        : regionIds?.length
          ? { country: { regionId: { in: regionIds } } }
          : {}),
      ...(search
        ? { name: { contains: search, mode: "insensitive" } }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.city.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          country: {
            select: { id: true, name: true, regionId: true },
          },
        },
      }),
      this.prisma.city.count({ where }),
    ]);

    return {
      data: rows.map((row) => new ResponseListCityDto(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
