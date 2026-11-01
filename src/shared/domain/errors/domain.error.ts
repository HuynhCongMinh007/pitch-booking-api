export type DomainErrorKind = 'invalid' | 'not_found' | 'conflict';

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly kind: DomainErrorKind;
}
