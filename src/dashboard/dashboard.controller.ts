import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { JwtGuard } from "../auth/guard/jwt.guard";
import { RoleGuard } from "../auth/guard/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RoleEnums } from "../common/enum/role.enum";

@UseGuards(JwtGuard, RoleGuard)
@Roles(RoleEnums.ADMIN)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("summary")
  getSummary(@Query("days") daysRaw?: string) {
    const days = daysRaw ? Number(daysRaw) : undefined;
    return this.dashboardService.getSummary(
      Number.isFinite(days) ? days : undefined,
    );
  }
}
