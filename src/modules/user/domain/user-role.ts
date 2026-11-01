// Stored as a plain string in the database (same as the Python backend)

export const UserRole = {
  CUSTOMER: 'customer',
  OWNER: 'owner',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
