import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // Not authenticated - redirect to login
    if (!user) {
      navigate('/auth/login', { replace: true });
      return;
    }

    // Check role restrictions if specified
    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
      // Redirect to appropriate dashboard based on role
      switch (profile.role) {
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'agent':
          navigate('/agent', { replace: true });
          break;
        case 'student':
        default:
          navigate('/dashboard/student', { replace: true });
          break;
      }
    }
  }, [user, profile, loading, allowedRoles, navigate]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Role not allowed
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
}
