import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { PaginationSearchQueryDto } from "../../common/dto/pagination-search-query.dto";
import { parseIdListQuery } from "../../common/utils/parse-id-list-query";

function toIdList(value: unknown): number[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseIdListQuery(value as string | string[]);
}

export class PublicDocumentGuideQueryDto extends PaginationSearchQueryDto {
  @IsOptional()
  @IsIn(["id", "en"])
  locale?: "id" | "en";

  /** `popular` = PAID order count desc, then newest. Default / `newest` = createdAt desc. */
  @IsOptional()
  @IsIn(["popular", "newest"])
  sort?: "popular" | "newest";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  regionId?: number;

  @IsOptional()
  @Transform(({ value }) => toIdList(value))
  regionIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  countryId?: number;

  @IsOptional()
  @Transform(({ value }) => toIdList(value))
  countryIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cityId?: number;

  @IsOptional()
  @Transform(({ value }) => toIdList(value))
  cityIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  tripDays?: number;
}
