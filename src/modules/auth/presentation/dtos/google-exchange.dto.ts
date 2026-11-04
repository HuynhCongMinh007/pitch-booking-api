import { z } from 'zod';

export const googleExchangeRequestSchema = z.object({
  code: z.string().min(1, 'code is required'),
  state: z.string().min(1, 'state is required').max(256),
});

export type GoogleExchangeRequestDto = z.output<typeof googleExchangeRequestSchema>;

