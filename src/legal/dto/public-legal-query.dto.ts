import { IsIn, IsOptional } from "class-validator";

export class PublicLegalQueryDto {
  @IsOptional()
  @IsIn(["id", "en"])
  locale?: "id" | "en";
}
