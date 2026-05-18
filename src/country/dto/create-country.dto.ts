import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class CreateCountryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  regionId: number;
}
