// Stored as a plain string in the database (same as the Python backend)

export const OtpPurpose = {
  REGISTER: 'REGISTER',
  RESET_PASSWORD: 'RESET_PASSWORD',
} as const;

export type OtpPurpose = (typeof OtpPurpose)[keyof typeof OtpPurpose];
