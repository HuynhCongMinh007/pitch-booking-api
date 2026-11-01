// Stored as a plain string in the database (same as the Python backend)

export const SportType = {
  FOOTBALL: 'FOOTBALL',
} as const;

export type SportType = (typeof SportType)[keyof typeof SportType];
