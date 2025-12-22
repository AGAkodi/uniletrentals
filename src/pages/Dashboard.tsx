import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export default function Dashboard() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!profile) {
      navigate('/auth/login');
      return;
    }

    // Redirect based on user role
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
  }, [profile, loading, navigate]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
