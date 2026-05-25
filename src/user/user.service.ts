import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Role } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ErrorMessages } from "../common/constants/message.constants";
import { SuccessMessages } from "../common/constants/message.constants";
import { PaginationSearchQueryDto } from "../common/dto/pagination-search-query.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ResponseUserDto } from "./dto/response-user.dto";
import { RoleEnums } from "../common/enum/role.enum";
import { plainToInstance } from "class-transformer";
import * as bcrypt from "bcrypt";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (existing) {
      throw new ConflictException(ErrorMessages.EMAIL_ALREADY_EXISTS);
    }

    const hashPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.trim().toLowerCase(),
        password: hashPassword,
        role: dto.role as Role,
      },
    });
    return plainToInstance(ResponseUserDto, user);
  }

  async findAll(query: PaginationSearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = search
      ? { email: { contains: search, mode: "insensitive" } }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: rows.map((row) => plainToInstance(ResponseUserDto, row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }
    return plainToInstance(ResponseUserDto, user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }

    if (dto.email && dto.email.trim().toLowerCase() !== user.email) {
      const taken = await this.prisma.user.findUnique({
        where: { email: dto.email.trim().toLowerCase() },
      });
      if (taken) {
        throw new ConflictException(ErrorMessages.EMAIL_ALREADY_EXISTS);
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) {
      data.email = dto.email.trim().toLowerCase();
    }
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 12);
    }
    if (dto.role !== undefined) {
      data.role = dto.role as Role;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });
    return plainToInstance(ResponseUserDto, updated);
  }

  async remove(id: string, actorId: string) {
    if (id === actorId) {
      throw new ConflictException(ErrorMessages.USER_CANNOT_DELETE_SELF);
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(ErrorMessages.DATA_NOT_FOUND);
    }

    const orderCount = await this.prisma.order.count({ where: { userId: id } });
    if (orderCount > 0) {
      throw new ConflictException(ErrorMessages.USER_HAS_ORDERS);
    }

    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);

    return { message: SuccessMessages.DELETE_SUCCESS };
  }
}
