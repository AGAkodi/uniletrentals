import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AgentSidebar } from './AgentSidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Link } from 'react-router-dom';

interface AgentLayoutProps {
  children: ReactNode;
  title?: string;
}

function AgentLayoutContent({ children, title }: AgentLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-secondary/30">
        <AgentSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="h-14 flex items-center justify-between border-b border-border bg-background px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <Link to="/" className="font-bold text-xl text-primary">
                UniLet
              </Link>
              {title && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <h1 className="font-semibold">{title}</h1>
                </>
              )}
            </div>
            <NotificationBell />
          </header>
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function AgentLayout({ children, title }: AgentLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['agent']}>
      <AgentLayoutContent title={title}>{children}</AgentLayoutContent>
    </ProtectedRoute>
  );
}
