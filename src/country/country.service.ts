import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateCountryDto } from "./dto/create-country.dto";
import { UpdateCountryDto } from "./dto/update-country.dto";
import { PrismaService } from "../prisma/prisma.service";
import { Country, Prisma } from "../../generated/prisma/client";
import { ErrorMessages } from "../common/constants/message.constants";
import { PaginationSearchQueryDto } from "../common/dto/pagination-search-query.dto";
import { ResponseListCountryDto } from "./dto/response-list-country.dto";

@Injectable()
export class CountryService {
  constructor(
    private prisma: PrismaService
  ) {}

  async create(req: CreateCountryDto) {
    const cekName = await this.findByName(req.name);
    if (cekName) throw new ConflictException(ErrorMessages.DATA_ALREADY_EXISTS);

    return this.prisma.country.create({
      data: {
        name: req.name,
        regionId: req.regionId,
      },
    });
  }

  async findAll(query: PaginationSearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();

    const skip = (page - 1) * limit;

    const where: Prisma.CountryWhereInput = search
      ? {
          name: {
            contains: search,
            mode: "insensitive",
          },
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.country.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          region: { select: { id: true, name: true } },
        },
      }),
      this.prisma.country.count({ where }),
    ]);

    const data = rows.map((row) => new ResponseListCountryDto(row));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: number) {
    const data = await this.findByCountryId(id);
    if (!data) throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    return data;
  }

  async update(id: number, req: UpdateCountryDto) {
    const data = await this.findByCountryId(id);
    if (!data) throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);

    if (req.regionId !== undefined) {
      const region = await this.prisma.region.findUnique({
        where: { id: req.regionId },
      });
      if (!region) throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }

    if (req.name) {
      const cekName = await this.findByName(req.name);

      if (cekName && cekName.id !== id) {
        throw new ConflictException(ErrorMessages.DATA_ALREADY_EXISTS);
      }
    }

    const updateData: Prisma.CountryUpdateInput = {};
    if (req.name !== undefined) {
      updateData.name = req.name;
    }
    if (req.regionId !== undefined) {
      updateData.region = { connect: { id: req.regionId } };
    }

    return this.prisma.country.update({
      where: { id },
      data: updateData,
    });
  }

  remove(id: number) {
    return `This action removes a #${id} country`;
  }

  private async findByName(nameCountry: string): Promise<Country | null> {
    return this.prisma.country.findFirst({
      where: { name: { contains: nameCountry, mode: "insensitive" } },
    });
  }

  private findByCountryId(countryId: number): Promise<Country | null> {
    return this.prisma.country.findFirst({
      where: { id: countryId },
    });
  }
}
