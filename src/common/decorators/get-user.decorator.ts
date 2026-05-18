import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RegisterResponseDto } from '../../auth/dto/register-response.dto';

type RequestWithUser = Request & { user?: RegisterResponseDto };
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (data) {
      return user?.[data as keyof RegisterResponseDto];
    }
    return user;
  },
);