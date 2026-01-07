import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

// Check if a student profile is complete (has phone and student_id)
function isStudentProfileComplete(profile: { phone?: string | null; student_id?: string | null } | null): boolean {
  return !!(profile?.phone && profile?.student_id);
}

// Check if an agent profile is complete (has phone)
function isAgentProfileComplete(profile: { phone?: string | null } | null): boolean {
  return !!profile?.phone;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = '/auth/login' 
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    // Not authenticated - redirect to login
    if (!user) {
      navigate(redirectTo, { replace: true });
      return;
    }

    // Skip profile completion check if already on a completion page
    const completionPages = ['/auth/complete-student-profile', '/auth/complete-agent-profile'];
    if (completionPages.includes(location.pathname)) {
      return;
    }

    // Check if profile needs completion based on role
    if (profile) {
      if (profile.role === 'student' && !isStudentProfileComplete(profile)) {
        navigate('/auth/complete-student-profile', { replace: true });
        return;
      }
      
      if (profile.role === 'agent' && !isAgentProfileComplete(profile)) {
        navigate('/auth/complete-agent-profile', { replace: true });
        return;
      }
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
  }, [user, profile, loading, allowedRoles, navigate, redirectTo, location.pathname]);

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

  // Don't render if profile needs completion (unless on completion page)
  const completionPages = ['/auth/complete-student-profile', '/auth/complete-agent-profile'];
  if (!completionPages.includes(location.pathname) && profile) {
    if (profile.role === 'student' && !isStudentProfileComplete(profile)) {
      return null;
    }
    if (profile.role === 'agent' && !isAgentProfileComplete(profile)) {
      return null;
    }
  }

  // Don't render if role check fails
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
}
