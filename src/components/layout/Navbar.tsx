import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Home, LogOut, LayoutDashboard, User, Building2, Shield, CheckCircle, Heart, FileText, Users, AlertTriangle, GitCompare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from '@/components/notifications/NotificationBell';

const studentMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: User, label: 'Profile', href: '/student/profile' },
  { icon: Search, label: 'Browse Listings', href: '/search' },
  { icon: Heart, label: 'Saved Properties', href: '/student/saved' },
  { icon: Users, label: 'Shared Rental Space', href: '/student/shared-rentals' },
  { icon: GitCompare, label: 'Compare Listings', href: '/student/compare' },
  { icon: FileText, label: 'Blog', href: '/student/blog' },
];

const agentMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/agent' },
  { icon: Building2, label: 'Add Property', href: '/agent/add-property' },
  { icon: CheckCircle, label: 'Verification', href: '/agent/verification' },
  { icon: User, label: 'Profile', href: '/agent/profile' },
];

const adminMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: CheckCircle, label: 'Approve Listings', href: '/admin/approve-listings' },
  { icon: Shield, label: 'Verify Agents', href: '/admin/verify-agents' },
  { icon: AlertTriangle, label: 'Reports', href: '/admin/reports' },
  { icon: Users, label: 'Manage Admins', href: '/admin/manage-admins' },
  { icon: User, label: 'Profile', href: '/admin/profile' },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get menu items based on role
  const getMenuItems = () => {
    if (!profile?.role) return studentMenuItems;
    switch (profile.role) {
      case 'admin':
        return adminMenuItems;
      case 'agent':
        return agentMenuItems;
      case 'student':
      default:
        return studentMenuItems;
    }
  };

  const menuItems = getMenuItems();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">UNILET</span>
          </Link>

          {/* Auth Section - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/auth/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth/signup">Get Started</Link>
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative" aria-label="Open menu">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20 hover:ring-primary/50 transition-all cursor-pointer">
                        {profile?.avatar_url ? (
                          <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                        ) : null}
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-background border shadow-lg z-50">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-3 py-2">
                      <Avatar className="h-10 w-10">
                        {profile?.avatar_url ? (
                          <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                        ) : null}
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{profile?.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate capitalize">{profile?.role}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {menuItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <DropdownMenuItem
                        key={item.href}
                        onClick={() => navigate(item.href)}
                        className={`flex items-center gap-3 cursor-pointer ${isActive ? 'bg-secondary' : ''}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
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
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          {!user ? (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          ) : (
            <div className="md:hidden flex items-center gap-2">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative" aria-label="Open menu">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20 hover:ring-primary/50 transition-all cursor-pointer">
                      {profile?.avatar_url ? (
                        <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                      ) : null}
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-background border shadow-lg z-50">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-3 py-2">
                      <Avatar className="h-10 w-10">
                        {profile?.avatar_url ? (
                          <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                        ) : null}
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{profile?.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate capitalize">{profile?.role}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {menuItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <DropdownMenuItem
                        key={item.href}
                        onClick={() => navigate(item.href)}
                        className={`flex items-center gap-3 cursor-pointer ${isActive ? 'bg-secondary' : ''}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
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
            </div>
          )}
        </div>

        {/* Mobile Menu - Only for non-authenticated users */}
        {isOpen && !user && (
          <div className="md:hidden py-4 border-t animate-fade-in">
            <div className="flex flex-col gap-2">
              <Link
                to="/auth/login"
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Sign In
              </Link>
              <Link
                to="/auth/signup"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}