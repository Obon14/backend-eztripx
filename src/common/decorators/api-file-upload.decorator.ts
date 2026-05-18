import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

export function ApiFileUpload(
  fieldName: string = 'image',
  bodyProperties?: Record<string, { type: string }>,
  requiredFields?: string[],
) {
  const properties: Record<string, any> = { ...bodyProperties };
  properties[fieldName] = { type: 'string', format: 'binary' };

  return applyDecorators(
    UseInterceptors(FileInterceptor(fieldName)),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties,
        required: requiredFields,
      },
    }),
  );
}