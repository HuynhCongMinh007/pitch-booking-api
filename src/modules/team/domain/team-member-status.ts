// Stored as a plain string in the database (same as the Python backend)

export const TeamMemberStatus = {
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
} as const;

export type TeamMemberStatus = (typeof TeamMemberStatus)[keyof typeof TeamMemberStatus];
