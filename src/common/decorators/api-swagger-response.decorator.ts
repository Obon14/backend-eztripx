import { HttpStatus, applyDecorators, Type } from '@nestjs/common';
import { SuccessMessages } from '../constants/message.constants';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

interface SwaggerSuccessOptions {
  isArray?: boolean;
  withMeta?: boolean;
  metaExample?: unknown;
}

export const ApiSwaggerGlobalResponse = <DataDto extends Type<unknown>>(
  dataDto: DataDto,
  statusCode: number = 200,
  description: string = SuccessMessages.SUCCESS,
  options: SwaggerSuccessOptions = {},
) => {
  const isArray = options.isArray ?? false;
  const withMeta = options.withMeta ?? false;
  const dataSchema = isArray
    ? { type: 'array', items: { $ref: getSchemaPath(dataDto) } }
    : { $ref: getSchemaPath(dataDto) };

  return applyDecorators(
    ApiExtraModels(dataDto),
    ApiResponse({
      status: statusCode,
      description: description,
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: statusCode },
          message: { type: 'string', example: description },
          data: dataSchema,
          ...(withMeta
            ? {
                meta: {
                  type: 'object',
                  example: options.metaExample ?? {
                    page: 1,
                    limit: 10,
                    total: 100,
                    totalPages: 10,
                  },
                },
              }
            : {}),
        },
      },
    }),
  );
};

export const ApiSwaggerPaginatedResponse = <DataDto extends Type<unknown>>(
  dataDto: DataDto,
  description: string = SuccessMessages.SUCCESS,
) =>
  ApiSwaggerGlobalResponse(dataDto, HttpStatus.OK, description, {
    isArray: true,
    withMeta: true,
  });

export const ApiSwaggerGlobalErrorResponse = (
  statusCode: number,
  message: string,
  pathExample = '/example/path',
) =>
  ApiResponse({
    status: statusCode,
    description: message,
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: statusCode },
        message: { type: 'string', example: message },
        data: { nullable: true, example: null },
        error: { type: 'string', example: HttpStatus[statusCode] ?? 'Error' },
        path: { type: 'string', example: pathExample },
      },
    },
  });

export const ApiSwaggerFailedResponse = (
  description = 'Failed response',
  pathExample = '/example/path',
) =>
  ApiResponse({
    status: 'default',
    description,
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Bad Request' },
        data: { nullable: true, example: null },
        error: { type: 'string', example: 'Bad Request' },
        path: { type: 'string', example: pathExample },
      },
    },
  });

export const ApiSwaggerSimpleResponse = (
  statusCode = 200,
  description = SuccessMessages.SUCCESS,
  dataExample: string | number | boolean | null = null,
) =>
  ApiResponse({
    status: statusCode,
    description,
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: statusCode },
        message: { type: 'string', example: description },
        data: { example: dataExample },
      },
    },
  });