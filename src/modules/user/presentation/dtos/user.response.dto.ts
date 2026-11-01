import type { Gender } from '../../domain/gender';
import type { UserRole } from '../../domain/user-role';

export interface UserResponseDto {
  id: number | null;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  full_name: string | null;
  phone_number: string | null;
  address: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  bio: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}
