// Stored as a plain string in the database (same as the Python backend)

export const PitchType = {
  PITCH_5: 'PITCH_5',
  PITCH_7: 'PITCH_7',
  PITCH_11: 'PITCH_11',
} as const;

export type PitchType = (typeof PitchType)[keyof typeof PitchType];
