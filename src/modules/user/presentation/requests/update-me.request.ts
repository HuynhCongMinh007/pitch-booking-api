import { z } from 'zod';

import { sanitizeText, stripEmptyString, } from '../../../../shared/utils/sanitizer.util';
import type { UpdateMeInput } from '../../application/dtos/user.dto';
import { Gender } from '../../domain/enums/gender.enum';
import { USERNAME_REGEX } from '../../domain/value-objects/username.vo';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_CLEANED_REGEX = /^\+?[0-9]{7,15}$/;
const HTTP_URL_REGEX = /^https?:\/\/\S+$/i;

function getTodayIsoString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIsoCalendarDate(value: string): Date | null {
  if (!ISO_DATE_REGEX.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return null;
  }
  return parsed;
}

const optionalSanitizedText = (maxLen: number) =>
  z.preprocess(sanitizeText, z.string().max(maxLen).nullable().optional());

const optionalUsername = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() : v),
  z
    .string()
    .min(6, 'Username must be at least 6 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(USERNAME_REGEX, 'Username can only contain letters, digits, underscores, and dots')
    .optional(),
);

const optionalPhoneNumber = z.preprocess(
  stripEmptyString,
  z
    .string()
    .transform((v, ctx) => {
      const cleaned = v.replace(/[\s\-().]/g, '');
      if (!PHONE_CLEANED_REGEX.test(cleaned) || cleaned.length > 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid phone number (must contain 7 to 15 digits)',
        });
        return z.NEVER;
      }
      return cleaned;
    })
    .nullable()
    .optional(),
);

const optionalAvatarUrl = z.preprocess(
  stripEmptyString,
  z
    .string()
    .max(500)
    .refine((v) => HTTP_URL_REGEX.test(v), {
      message: 'avatar_url must be an http(s) URL',
    })
    .nullable()
    .optional(),
);

const optionalGender = z.preprocess(
  (v) => {
    if (v === null || v === undefined) {
      return v;
    }
    if (typeof v === 'string') {
      const cleaned = v.trim().toUpperCase();
      return cleaned.length > 0 ? cleaned : null;
    }
    return v;
  },
  z.nativeEnum(Gender).nullable().optional(),
);

const optionalDateOfBirth = z.preprocess(
  stripEmptyString,
  z
    .string()
    .transform((v, ctx) => {
      const date = parseIsoCalendarDate(v);
      if (!date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'date_of_birth must be a valid YYYY-MM-DD date',
        });
        return z.NEVER;
      }
      if (v > getTodayIsoString()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'date_of_birth cannot be in the future',
        });
        return z.NEVER;
      }
      return date;
    })
    .nullable()
    .optional(),
);

export const updateMeRequestSchema = z
  .object({
    username: optionalUsername,
    full_name: optionalSanitizedText(255),
    phone_number: optionalPhoneNumber,
    address: optionalSanitizedText(255),
    avatar_url: optionalAvatarUrl,
    date_of_birth: optionalDateOfBirth,
    gender: optionalGender,
    bio: optionalSanitizedText(1000),
  })
  .transform((raw): UpdateMeInput['changes'] => {
    const changes: UpdateMeInput['changes'] = {};
    if (raw.username !== undefined) changes.username = raw.username;
    if (raw.full_name !== undefined) changes.fullName = raw.full_name;
    if (raw.phone_number !== undefined) changes.phoneNumber = raw.phone_number;
    if (raw.address !== undefined) changes.address = raw.address;
    if (raw.avatar_url !== undefined) changes.avatarUrl = raw.avatar_url;
    if (raw.date_of_birth !== undefined) changes.dateOfBirth = raw.date_of_birth;
    if (raw.gender !== undefined) changes.gender = raw.gender;
    if (raw.bio !== undefined) changes.bio = raw.bio;
    return changes;
  });

export type UpdateMeChangesDto = z.output<typeof updateMeRequestSchema>;

