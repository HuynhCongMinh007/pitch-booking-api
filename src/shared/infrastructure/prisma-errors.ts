import { Prisma } from '@prisma/client';

// Prisma error codes for constraint violations (the equivalent of SQLAlchemy's IntegrityError)
const INTEGRITY_ERROR_CODES = ['P2002', 'P2003', 'P2004', 'P2011'];

export function isIntegrityError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    INTEGRITY_ERROR_CODES.includes(error.code)
  );
}
