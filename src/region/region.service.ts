import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { PrismaService } from "../prisma/prisma.service";
import { ErrorMessages } from "../common/constants/message.constants";
import { Region, Prisma } from "../../generated/prisma/client";
import { PaginationSearchQueryDto } from "../common/dto/pagination-search-query.dto";
import { ResponseListRegionDto } from "./dto/response-list-region.dto";

@Injectable()
export class RegionService {
  constructor(
    private prisma: PrismaService
  ) {}
  async create(req: CreateRegionDto) {
    const cekName = await this.findByNameCountry(req.name)
    if (cekName) throw new ConflictException(ErrorMessages.DATA_ALREADY_EXISTS)

    return this.prisma.region.create({
      data: {
        name: req.name,
      }
    });
  }

  async findAll(query: PaginationSearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();

    const skip = (page - 1) * limit;

    const where: Prisma.RegionWhereInput = search
    ? {
        name: {
          contains: search,
          mode: 'insensitive'
        }
      } : {}

    const [ rows, total ] = await Promise.all([
      this.prisma.region.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      this.prisma.region.count({ where })
    ])

    const data = rows.map((row) => new ResponseListRegionDto(row));

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
    const data = await this.findByRegionId(id)
    if (!data) throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    return data;
  }

  async update(id: number, req: UpdateRegionDto) {
    const data = await this.findByRegionId(id)
    if (!data) throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);

    if(req.name){
      const cekName = await this.findByNameCountry(req.name)

      if(cekName && cekName.id !== id){
        throw new ConflictException(ErrorMessages.DATA_ALREADY_EXISTS)
      }
    }
    return this.prisma.region.update({
      where: { id: id },
      data: { name: req.name },
    });
  }

  remove(id: number) {
    return `This action removes a #${id} region`;
  }

  private async findByNameCountry(nameRegion: string): Promise<Region | null> {
    return this.prisma.region.findFirst({
      where: { name: { contains: nameRegion, mode: 'insensitive' } },
    })
  }

  findByRegionId(regionId: number): Promise<Region | null> {
    return this.prisma.region.findFirst({
      where: {id: regionId},
    })
  }
}
