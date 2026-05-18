import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { TagDocumentDestinationItemDto } from "./tag-document-destination-item.dto";

export class CreateDocumentGuideDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceIdr?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceUsd?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TagDocumentDestinationItemDto)
  tags: TagDocumentDestinationItemDto[];
}
