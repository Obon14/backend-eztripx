import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateLegalDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  titleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  titleEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  titleHighlightId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  titleHighlightEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  introId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  introEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  bodyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  bodyEn?: string;
}
