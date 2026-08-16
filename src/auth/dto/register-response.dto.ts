import { Exclude, Expose } from "class-transformer";
import { RoleEnums } from "../../common/enum/role.enum";

@Exclude()
export class RegisterResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  createdAt: Date;

  @Expose()
  role: RoleEnums;

  @Expose()
  displayName: string | null;

  @Expose()
  hasAvatar: boolean;
}

export function toRegisterResponse(user: {
  id: string;
  email: string;
  createdAt: Date;
  role: string;
  displayName?: string | null;
  avatarFilename?: string | null;
}): RegisterResponseDto {
  const dto = new RegisterResponseDto();
  dto.id = user.id;
  dto.email = user.email;
  dto.createdAt = user.createdAt;
  dto.role = user.role as RoleEnums;
  dto.displayName = user.displayName?.trim() || null;
  dto.hasAvatar = Boolean(user.avatarFilename);
  return dto;
}
