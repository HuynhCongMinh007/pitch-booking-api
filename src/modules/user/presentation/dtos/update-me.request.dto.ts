import { z } from 'zod';

import { enumValues } from '../../../../shared/domain/enum';
import {
  blankToNull,
  sanitizeText,
  upperCaseOrNull,
} from '../../../../shared/presentation/sanitizers';
import { Gender } from '../../domain/gender';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Input should be a valid date (YYYY-MM-DD)')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, 'Input should be a valid date (YYYY-MM-DD)')
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const updateMeSchema = z.object({
  username: z.preprocess(blankToNull, z.string().nullish()),
  full_name: z.preprocess(sanitizeText, z.string().nullish()),
  phone_number: z.preprocess(blankToNull, z.string().nullish()),
  address: z.preprocess(sanitizeText, z.string().nullish()),
  avatar_url: z.preprocess(blankToNull, z.string().nullish()),
  date_of_birth: isoDate.nullish(),
  gender: z.preprocess(upperCaseOrNull, z.enum(enumValues(Gender)).nullish()),
  bio: z.preprocess(sanitizeText, z.string().nullish()),
});

export type UpdateMeRequest = z.infer<typeof updateMeSchema>;
