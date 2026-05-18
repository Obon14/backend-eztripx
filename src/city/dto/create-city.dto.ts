import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class CreateCityDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  countryId: number;
}
