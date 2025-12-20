import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export interface SidebarItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  badge?: number;
}

interface DashboardSidebarProps {
  items: SidebarItem[];
  userInfo: {
    name: string;
    subtitle: string;
    avatarUrl?: string;
  };
  extraContent?: React.ReactNode;
}

export function DashboardSidebar({ items, userInfo, extraContent }: DashboardSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleNavigation = (href: string) => {
    navigate(href);
    setIsOpen(false);
  };

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const sidebar = document.getElementById('dashboard-sidebar');
      const trigger = document.getElementById('avatar-trigger');
      if (isOpen && sidebar && !sidebar.contains(e.target as Node) && !trigger?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Avatar Trigger - positioned in top-right */}
      <button
        id="avatar-trigger"
        className="fixed top-20 right-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle sidebar"
      >
        <Avatar className="h-11 w-11 ring-2 ring-primary/20 hover:ring-primary/50 transition-all cursor-pointer">
          {userInfo.avatarUrl ? (
            <AvatarImage src={userInfo.avatarUrl} alt={userInfo.name} />
          ) : null}
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
            {userInfo.name?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - slides from right */}
      <aside
        id="dashboard-sidebar"
        className={cn(
          "fixed top-16 right-0 z-50 h-[calc(100vh-4rem)] w-72 bg-background border-l shadow-xl transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* User Info */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              {userInfo.avatarUrl ? (
                <AvatarImage src={userInfo.avatarUrl} alt={userInfo.name} />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                {userInfo.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{userInfo.name}</p>
              <p className="text-sm text-muted-foreground truncate">{userInfo.subtitle}</p>
            </div>
          </div>
          {extraContent}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-18rem)]">
          {items.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
