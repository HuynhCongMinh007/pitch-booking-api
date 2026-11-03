import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';

export type RateLimitPreset =
  | 'LOGIN'
  | 'REGISTER'
  | 'VERIFY_OTP'
  | 'SEND_OTP'
  | 'REFRESH';

interface ParsedWindow {
  limit: number;
  windowMs: number;
}

const UNIT_MS: Record<string, number> = {
  second: 1_000,
  seconds: 1_000,
  minute: 60_000,
  minutes: 60_000,
  hour: 3_600_000,
  hours: 3_600_000,
  day: 86_400_000,
  days: 86_400_000,
};

@Injectable()
export class RateLimitService {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly config: AppConfigService) {}

  consume(preset: RateLimitPreset, routeId: string, clientIp: string): boolean {
    if (!this.config.rateLimitEnabled) {
      return true;
    }

    const spec = this.resolveSpec(preset);
    const windows = this.parseSpec(spec);
    if (windows.length === 0) {
      return true;
    }

    const now = Date.now();
    const maxWindowMs = Math.max(...windows.map((w) => w.windowMs));
    const key = `${routeId}:${preset}:${clientIp}`;

    const existing = (this.hits.get(key) ?? []).filter((ts) => now - ts < maxWindowMs);

    for (const windowRule of windows) {
      const countInWindow = existing.filter((ts) => now - ts < windowRule.windowMs).length;
      if (countInWindow >= windowRule.limit) {
        this.hits.set(key, existing);
        return false;
      }
    }

    existing.push(now);
    this.hits.set(key, existing);
    return true;
  }

  reset(): void {
    this.hits.clear();
  }

  private resolveSpec(preset: RateLimitPreset): string {
    switch (preset) {
      case 'LOGIN':
        return this.config.rateLimitLogin;
      case 'REGISTER':
        return this.config.rateLimitRegister;
      case 'VERIFY_OTP':
        return this.config.rateLimitVerifyOtp;
      case 'SEND_OTP':
        return this.config.rateLimitSendOtp;
      case 'REFRESH':
        return this.config.rateLimitRefresh;
    }
  }

  private parseSpec(spec: string): ParsedWindow[] {
    const parts = spec
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    const parsed: ParsedWindow[] = [];
    for (const part of parts) {
      const match = /^(\d+)\s*\/\s*([a-zA-Z]+)$/.exec(part);
      if (!match) {
        continue;
      }
      const limit = Number.parseInt(match[1], 10);
      const unitMs = UNIT_MS[match[2].toLowerCase()];
      if (limit > 0 && unitMs) {
        parsed.push({ limit, windowMs: unitMs });
      }
    }
    return parsed;
  }
}

