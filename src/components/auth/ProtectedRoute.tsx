import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = '/auth/login' 
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // Not authenticated - redirect to login
    if (!user) {
      navigate(redirectTo, { replace: true });
      return;
    }

    // Check role-based access if roles are specified
    if (allowedRoles && profile) {
      if (!allowedRoles.includes(profile.role)) {
        // Redirect to appropriate dashboard based on role
        const dashboardRoutes: Record<UserRole, string> = {
          student: '/dashboard',
          agent: '/agent',
          admin: '/admin',
        };
        navigate(dashboardRoutes[profile.role], { replace: true });
      }
    }
  }, [user, profile, loading, allowedRoles, navigate, redirectTo]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  // Don't render if role check fails
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
}
