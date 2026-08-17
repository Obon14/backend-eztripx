import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { OrderService } from "./order.service";
import { OrderAdminQueryDto } from "./dto/order-admin-query.dto";
import { JwtGuard } from "../auth/guard/jwt.guard";
import { RoleGuard } from "../auth/guard/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RoleEnums } from "../common/enum/role.enum";

@UseGuards(JwtGuard, RoleGuard)
@Roles(RoleEnums.ADMIN)
@Controller("admin/order")
export class OrderAdminController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  findAll(@Query() query: OrderAdminQueryDto) {
    return this.orderService.findAllAdmin(query);
  }

  @Post(":id/sync-status")
  syncStatus(@Param("id", ParseUUIDPipe) id: string) {
    return this.orderService.syncPaymentStatusAdmin(id);
  }
}
