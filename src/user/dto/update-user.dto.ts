import { IsEmail, IsEnum, IsOptional, MaxLength, MinLength } from "class-validator";
import { ErrorMessages } from "../../common/constants/message.constants";
import { RoleEnums } from "../../common/enum/role.enum";

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: ErrorMessages.EMAIL_FORMAT })
  email?: string;

  @IsOptional()
  @MinLength(6, { message: ErrorMessages.PASSWORD_MIN })
  @MaxLength(25, { message: ErrorMessages.PASSWORD_MAX })
  password?: string;

  @IsOptional()
  @IsEnum(RoleEnums)
  role?: RoleEnums;
}
