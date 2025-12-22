import { UserRole } from '@/types/database';

/**
 * Returns the correct dashboard path based on user role
 */
export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'agent':
      return '/agent';
    case 'student':
    default:
      return '/dashboard/student';
  }
}
