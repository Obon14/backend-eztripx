import { IsInt, IsOptional, Min } from "class-validator";

export class TagDocumentDestinationItemDto {
  @IsInt()
  @Min(1)
  regionId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  countryId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  cityId?: number;
}
