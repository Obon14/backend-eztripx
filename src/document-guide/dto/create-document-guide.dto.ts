import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { DocumentGuideStatus } from "../../../generated/prisma/client";
import { TagDocumentDestinationItemDto } from "./tag-document-destination-item.dto";

export class CreateDocumentGuideDto {
  @IsString()
  @IsNotEmpty()
  titleId: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceIdr?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceUsd?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  tripDays?: number;

  @IsOptional()
  @IsEnum(DocumentGuideStatus)
  status?: DocumentGuideStatus;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TagDocumentDestinationItemDto)
  tags: TagDocumentDestinationItemDto[];
}
