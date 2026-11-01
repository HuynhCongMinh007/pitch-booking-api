// Stored as a plain string in the database (same as the Python backend)

export const TeamRole = {
  LEADER: 'LEADER',
  VICE_LEADER: 'VICE_LEADER',
  TREASURER: 'TREASURER',
  MEMBER: 'MEMBER',
} as const;

export type TeamRole = (typeof TeamRole)[keyof typeof TeamRole];
