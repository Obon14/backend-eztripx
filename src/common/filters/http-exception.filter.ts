import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ErrorMessages } from '../constants/message.constants';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorMessage: string | string[] = ErrorMessages.INTERNAL_SERVER_ERROR;

    if (exception instanceof ThrottlerException) {
      errorMessage = ErrorMessages.RATE_LIMIT_EXCEEDED;
    } else if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const resObj = exceptionResponse as Record<string, unknown>;
        errorMessage = resObj.message as string | string[];
      } else if (typeof exceptionResponse === 'string') {
        errorMessage = exceptionResponse;
      }

      if (status === 429) {
        errorMessage = ErrorMessages.RATE_LIMIT_EXCEEDED;
      }
    } else if (exception instanceof Error) {
      console.error(`[Unhandled Error] ${request.url}:`, exception.message);
    }

    response.status(status).json({
      statusCode: status,
      message: errorMessage,
      data: null,
      error: HttpStatus[status] ?? 'Error',
      path: request.url,
    })
  }
}