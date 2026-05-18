import { SetMetadata } from '@nestjs/common';
import { RoleEnums } from '../enum/role.enum';

export const ROLE_KEY = 'roles';
export const Roles = (...roles: RoleEnums[]) => SetMetadata(ROLE_KEY, roles);