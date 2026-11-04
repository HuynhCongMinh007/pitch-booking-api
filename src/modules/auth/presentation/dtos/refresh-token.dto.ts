import { z } from 'zod';

export const refreshTokenRequestSchema = z.preprocess(
  (v) => (v === undefined || v === null || v === '' ? {} : v),
  z.object({
    refresh_token: z.string().nullable().optional(),
  }),
);

export type RefreshTokenRequestDto = z.output<typeof refreshTokenRequestSchema>;

