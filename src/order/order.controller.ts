import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { OrderService } from "./order.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { JwtGuard } from "../auth/guard/jwt.guard";
import { GetUser } from "../common/decorators/get-user.decorator";
import { RegisterResponseDto } from "../auth/dto/register-response.dto";

@UseGuards(JwtGuard)
@Controller("order")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(
    @GetUser() user: RegisterResponseDto,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.orderService.create(user.id, user.email, createOrderDto);
  }

  @Get()
  findAll(@GetUser("id") userId: string) {
    return this.orderService.findAllByUser(userId);
  }

  @Get(":id")
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @GetUser("id") userId: string,
  ) {
    return this.orderService.findOneForUser(id, userId);
  }

  @Post(":id/sync-status")
  syncStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @GetUser("id") userId: string,
  ) {
    return this.orderService.syncPaymentStatus(id, userId);
  }
}
