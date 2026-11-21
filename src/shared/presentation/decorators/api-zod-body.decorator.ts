import { ApiBody } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { ZodBoolean, ZodNumber, ZodObject, type ZodTypeAny } from 'zod';

function unwrapZod(schema: ZodTypeAny): ZodTypeAny {
  let current: any = schema;
  while (current?._def?.innerType || current?._def?.schema) {
    current = current._def.innerType ?? current._def.schema;
  }
  return current;
}

function getPrimitiveType(schema: ZodTypeAny): string {
  const inner = unwrapZod(schema);
  if (inner instanceof ZodBoolean) return 'boolean';
  if (inner instanceof ZodNumber) return 'number';
  return 'string';
}

export function ApiZodBody(
  schema: ZodTypeAny,
  options?: { required?: boolean },
): MethodDecorator {
  const root = unwrapZod(schema);
  const shape = root instanceof ZodObject ? root.shape : {};
  const properties: Record<string, SchemaObject> = {};

  for (const [key, field] of Object.entries(shape)) {
    properties[key] = { type: getPrimitiveType(field as ZodTypeAny) };
  }

  return ApiBody({
    required: options?.required,
    schema: { type: 'object', properties },
  });
}
