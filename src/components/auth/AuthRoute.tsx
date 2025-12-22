import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

interface AuthRouteProps {
  children: React.ReactNode;
}

/**
 * Route wrapper for auth pages (login/signup).
 * Redirects authenticated users to their dashboard.
 */
export function AuthRoute({ children }: AuthRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // Already authenticated - redirect to dashboard
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // User is authenticated, will redirect
  if (user) {
    return null;
  }

  return <>{children}</>;
}
