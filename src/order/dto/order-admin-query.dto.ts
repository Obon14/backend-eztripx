import { IsEnum, IsOptional } from "class-validator";
import { StatusPayment } from "../../../generated/prisma/client";
import { PaginationSearchQueryDto } from "../../common/dto/pagination-search-query.dto";

export class OrderAdminQueryDto extends PaginationSearchQueryDto {
  @IsOptional()
  @IsEnum(StatusPayment)
  status?: StatusPayment;
}
