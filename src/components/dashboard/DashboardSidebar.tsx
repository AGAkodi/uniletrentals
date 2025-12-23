import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

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
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notifications count
  useEffect(() => {
    if (!user?.id) return;

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('notifications-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="fixed top-4 right-4 z-50 relative"
          aria-label="Open menu"
        >
          <Avatar className="h-11 w-11 ring-2 ring-primary/20 hover:ring-primary/50 transition-all cursor-pointer">
            {userInfo.avatarUrl ? (
              <AvatarImage src={userInfo.avatarUrl} alt={userInfo.name} />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {userInfo.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-medium rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-background border shadow-lg z-50">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3 py-2">
            <Avatar className="h-10 w-10">
              {userInfo.avatarUrl ? (
                <AvatarImage src={userInfo.avatarUrl} alt={userInfo.name} />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {userInfo.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{userInfo.name}</p>
              <p className="text-sm text-muted-foreground truncate">{userInfo.subtitle}</p>
            </div>
          </div>
          {extraContent}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <DropdownMenuItem
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                "flex items-center gap-3 cursor-pointer",
                isActive && "bg-secondary"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="flex items-center gap-3 text-destructive cursor-pointer focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
