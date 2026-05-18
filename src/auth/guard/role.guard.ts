import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from '../../common/decorators/roles.decorator';
import { RoleEnums } from '../../common/enum/role.enum';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleEnums[]>(
      ROLE_KEY,
      [context.getHandler(), context.getClass()])

    if (!requiredRoles) return true;

    const req = context.switchToHttp().getRequest<{
      user: { role:  RoleEnums}
    }>();

    return requiredRoles.includes(req.user.role)
  }
}