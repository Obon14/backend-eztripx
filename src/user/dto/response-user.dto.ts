import { Exclude, Expose } from "class-transformer";
import { RoleEnums } from "../../common/enum/role.enum";

@Exclude()
export class ResponseUserDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  role: RoleEnums;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
