import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";
import { PaginationSearchQueryDto } from "../../common/dto/pagination-search-query.dto";
import { parseIdListQuery } from "../../common/utils/parse-id-list-query";

function toIdList(value: unknown): number[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseIdListQuery(value as string | string[]);
}

export class GeoCityQueryDto extends PaginationSearchQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  countryId?: number;

  @IsOptional()
  @Transform(({ value }) => toIdList(value))
  countryIds?: number[];

  /** When set (and no countryIds), cities are limited to countries in these regions. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  regionId?: number;

  @IsOptional()
  @Transform(({ value }) => toIdList(value))
  regionIds?: number[];
}
