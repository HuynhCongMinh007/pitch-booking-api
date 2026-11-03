export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export function parseGender(value: unknown): Gender | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    const cleaned = value.trim().toUpperCase();
    if (!cleaned) {
      return null;
    }
    if (cleaned === Gender.MALE || cleaned === Gender.FEMALE || cleaned === Gender.OTHER) {
      return cleaned as Gender;
    }
  }
  throw new Error('Invalid gender value');
}

