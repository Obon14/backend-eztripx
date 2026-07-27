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
  ValidateIf,
  ValidateNested,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import {
  DocumentGuidePreviewMode,
  DocumentGuideStatus,
} from "../../../generated/prisma/client";
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

  /** hide = limited public pages; show = full public PDF. Default hide. */
  @IsOptional()
  @IsEnum(DocumentGuidePreviewMode)
  previewMode?: DocumentGuidePreviewMode;

  /** Required when previewMode is hide (or omitted → hide). Ignored when show. */
  @ValidateIf(
    (o: CreateDocumentGuideDto) =>
      (o.previewMode ?? DocumentGuidePreviewMode.hide) ===
      DocumentGuidePreviewMode.hide,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  @Type(() => Number)
  previewPageCount?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TagDocumentDestinationItemDto)
  tags: TagDocumentDestinationItemDto[];
}
