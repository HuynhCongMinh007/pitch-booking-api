import {
  ArgumentMetadata,
  HttpStatus,
  ParseIntPipe,
  PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ZodTypeAny } from 'zod';

/**
 * Validates and transforms request data with a zod schema (like Pydantic models in FastAPI).
 * Invalid data returns 422 with a FastAPI-style body: { detail: [{ type, loc, msg }] }.
 *
 * Usage: @Body(new ZodValidationPipe(registerSchema)) data
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodTypeAny) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }

    throw new UnprocessableEntityException({
      detail: result.error.issues.map((issue) => ({
        type: issue.code,
        loc: [metadata.type, ...issue.path],
        msg: issue.message,
      })),
    });
  }
}

/** Path parameter that must be an integer (422 like FastAPI otherwise). */
export function intParam(): ParseIntPipe {
  return new ParseIntPipe({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY });
}
