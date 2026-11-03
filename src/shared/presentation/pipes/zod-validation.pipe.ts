import { PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import type { ZodType, ZodTypeDef } from 'zod';

export class ZodValidationPipe<TOutput> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: ZodType<TOutput, ZodTypeDef, unknown>) { }

  transform(value: unknown): TOutput {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const fieldPath = firstIssue?.path.length ? `${firstIssue.path.join('.')}: ` : '';
      const message = firstIssue ? `${fieldPath}${firstIssue.message}` : 'Validation failed';
      throw new UnprocessableEntityException(message);
    }
    return parsed.data;
  }
}