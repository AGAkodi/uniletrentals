import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
    children: React.ReactNode;
    requiredPermission?: string;
}

export function AdminRoute({ children, requiredPermission }: AdminRouteProps) {
    const { user, profile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Not authenticated
    if (!user || !profile) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    // Not an admin
    if (profile.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    // Super Admin bypass
    const isSuperAdmin = profile.permissions?.includes('super_admin');
    if (isSuperAdmin) {
        return <>{children}</>;
    }

    // Check specific permission if required
    if (requiredPermission) {
        const hasPermission = profile.permissions?.includes(requiredPermission);

        if (!hasPermission) {
            // Redirect to admin dashboard if they have access to it, otherwise home
            return <Navigate to="/admin/dashboard" replace />;
        }
    }

    return <>{children}</>;
}
