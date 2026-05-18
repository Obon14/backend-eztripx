import { applyDecorators } from '@nestjs/common';
import { ErrorMessages } from '../constants/message.constants';
import { ApiSwaggerGlobalErrorResponse } from './api-swagger-response.decorator';


export const ApiSwaggerTooManyRequests = () =>
  applyDecorators(
    ApiSwaggerGlobalErrorResponse(
      429,
      ErrorMessages.RATE_LIMIT_EXCEEDED,
      '/auth/login',
    ),
  );
