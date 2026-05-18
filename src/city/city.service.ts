import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateCityDto } from "./dto/create-city.dto";
import { UpdateCityDto } from "./dto/update-city.dto";
import { PrismaService } from "../prisma/prisma.service";
import { City, Prisma } from "../../generated/prisma/client";
import { ErrorMessages } from "../common/constants/message.constants";
import { PaginationSearchQueryDto } from "../common/dto/pagination-search-query.dto";
import { ResponseListCityDto } from "./dto/response-list-city.dto";

@Injectable()
export class CityService {
  constructor(
    private prisma: PrismaService
  ) {}

  async create(req: CreateCityDto) {
    const cekName = await this.findByName(req.name);
    if (cekName) throw new ConflictException(ErrorMessages.DATA_ALREADY_EXISTS);

    return this.prisma.city.create({
      data: {
        name: req.name,
        countryId: req.countryId,
      },
    });
  }

  async findAll(query: PaginationSearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();

    const skip = (page - 1) * limit;

    const where: Prisma.CityWhereInput = search
      ? {
          name: {
            contains: search,
            mode: "insensitive",
          },
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.city.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          country: { select: { id: true, name: true } }
        }
      }),
      this.prisma.city.count({ where }),
    ]);

    const data = rows.map((row) => new ResponseListCityDto(row));

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
    const data = await this.findByCityId(id);
    if (!data) throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    return data;
  }

  async update(id: number, req: UpdateCityDto) {
    const data = await this.findByCityId(id);
    if (!data) throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);

    if (req.countryId !== undefined) {
      const country = await this.prisma.country.findUnique({
        where: { id: req.countryId },
      });
      if (!country) throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }

    if (req.name) {
      const cekName = await this.findByName(req.name);

      if (cekName && cekName.id !== id) {
        throw new ConflictException(ErrorMessages.DATA_ALREADY_EXISTS);
      }
    }

    const updateData: Prisma.CityUpdateInput = {};
    if (req.name !== undefined) {
      updateData.name = req.name;
    }
    if (req.countryId !== undefined) {
      updateData.country = { connect: { id: req.countryId } };
    }

    return this.prisma.city.update({
      where: { id },
      data: updateData,
    });
  }

  remove(id: number) {
    return `This action removes a #${id} city`;
  }

  private async findByName(nameCity: string): Promise<City | null> {
    return this.prisma.city.findFirst({
      where: { name: { contains: nameCity, mode: "insensitive" } },
    });
  }

  private findByCityId(cityId: number): Promise<City | null> {
    return this.prisma.city.findFirst({
      where: { id: cityId },
    });
  }
}
