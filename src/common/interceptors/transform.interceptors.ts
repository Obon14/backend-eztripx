import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T>{
  statusCode: number;
  message: string;
  data: T;
  meta?: unknown;
}

@Injectable()
export class TransformInterceptors<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {

    const ctx = context.switchToHttp();
    const response = ctx.getResponse<ExpressResponse>();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((res: unknown): Response<T> => {
        const resObj = (res as Record<string, unknown>) || {};
        const hasMeta = res && typeof res === 'object' && 'meta' in resObj;
        const message = typeof resObj.message === 'string' ? resObj.message : 'Success';
        const data = (hasMeta ? resObj.data : res) as T;

        const finalResponse: Response<T> = {
          statusCode: statusCode,
          message: message,
          data: data,
        }

        if (hasMeta) {
          finalResponse.meta = resObj.meta;
        }

        return finalResponse;
      }),
    );
  }
}