import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';

import { settings } from './config';

// NOTE: Production Deployment Checklist:
// 1. Reverse Proxy (Nginx / Cloudflare / Docker):
//    The limiter keys on `req.ip` (the immediate socket address). Behind a reverse proxy,
//    enable Express "trust proxy" so `req.ip` resolves the real client IP from X-Forwarded-For.
//
// 2. Multi-Process / Multi-Container Environments:
//    Counters live in memory of a single Node process. When running several instances,
//    move this store to a shared Redis instance.

interface Limit {
  amount: number;
  seconds: number;
  label: string;
}

const UNIT_SECONDS: Record<string, number> = { second: 1, minute: 60, hour: 3600, day: 86400 };

const parsedLimits = new Map<string, Limit[]>();

/**
 * Parse a limit string such as "5/minute;20/hour" (or "5 per minute")
 * into [{ amount, seconds, label }].
 */
export function parseRateLimit(limitString: string): Limit[] {
  const cached = parsedLimits.get(limitString);
  if (cached) return cached;

  const limits = limitString
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(\d+)\s*(?:\/|per)\s*(\d+)?\s*(second|minute|hour|day)s?$/i);
      if (!match) throw new Error(`Invalid rate limit: "${part}"`);
      const amount = Number(match[1]);
      const multiples = Number(match[2] || 1);
      const unit = match[3].toLowerCase();
      return {
        amount,
        seconds: multiples * UNIT_SECONDS[unit],
        label: `${amount} per ${multiples} ${unit}`,
      };
    });

  parsedLimits.set(limitString, limits);
  return limits;
}

/** Fixed-window counters kept in memory (see the deployment notes above). */
export class RateLimiter {
  // key -> { count, resetAt }
  private readonly counters = new Map<string, { count: number; resetAt: number }>();

  /** Returns the label of the first exceeded limit, or null when the request is allowed. */
  hit(key: string, limitString: string, now = Date.now()): string | null {
    for (const limit of parseRateLimit(limitString)) {
      const counterKey = `${key}:${limit.label}`;
      let counter = this.counters.get(counterKey);
      if (!counter || counter.resetAt <= now) {
        counter = { count: 0, resetAt: now + limit.seconds * 1000 };
        this.counters.set(counterKey, counter);
      }
      counter.count += 1;
      if (counter.count > limit.amount) return limit.label;
    }
    return null;
  }

  /** Remove expired counters so memory does not grow forever. */
  purgeExpired(now = Date.now()): void {
    for (const [key, counter] of this.counters) {
      if (counter.resetAt <= now) this.counters.delete(key);
    }
  }

  clear(): void {
    this.counters.clear();
  }
}

const limiter = new RateLimiter();

/**
 * Fixed-window rate limit per client IP and scope (usually one scope per endpoint).
 * Throws 429 when any of the configured limits is exceeded.
 */
export function checkRateLimit(req: Request, scope: string, limitString: string): void {
  if (!settings.RATE_LIMIT_ENABLED) return;

  const exceeded = limiter.hit(`${scope}:${req.ip}`, limitString);
  if (exceeded) {
    throw new HttpException(
      { error: `Rate limit exceeded: ${exceeded}` },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export function resetRateLimits(): void {
  limiter.clear();
}

setInterval(() => limiter.purgeExpired(), 60 * 1000).unref();
