export type ApplicationErrorKind = 'unauthorized' | 'forbidden' | 'not_found';

/** A request the application layer refuses (not a business rule: those are DomainError). */
export abstract class ApplicationError extends Error {
  abstract readonly code: string;
  abstract readonly kind: ApplicationErrorKind;
}
