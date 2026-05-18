import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  MaxLength,
  MinLength,
} from "class-validator";
import { ErrorMessages } from '../../common/constants/message.constants';
import { RoleEnums } from "../../common/enum/role.enum";

export class RegisterDto {

  @IsNotEmpty({message:ErrorMessages.EMAIL_CANNOT_EMPTY})
  @IsEmail({}, {message: ErrorMessages.EMAIL_FORMAT})
  email: string;

  @IsNotEmpty()
  @MinLength(6, {message: ErrorMessages.PASSWORD_MIN} )
  @MaxLength(25, {message: ErrorMessages.PASSWORD_MAX} )
  password: string;

  @IsNotEmpty()
  @IsEnum(RoleEnums)
  role: RoleEnums
}