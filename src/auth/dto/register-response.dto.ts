import { Exclude, Expose, Type } from "class-transformer";

class RoleResponse {
  @Expose()
  nameRole: string;
}

@Exclude()
export class RegisterResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => RoleResponse)
  role: RoleResponse;
}