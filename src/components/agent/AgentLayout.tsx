import { ReactNode } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';

interface AgentLayoutProps {
  children: ReactNode;
  title?: string;
}

function AgentLayoutContent({ children, title }: AgentLayoutProps) {
  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <main className="p-6">
        {title && (
          <h1 className="text-2xl font-bold mb-6">{title}</h1>
        )}
        {children}
      </main>
    </div>
  );
}

export function AgentLayout({ children, title }: AgentLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={['agent']}>
      <AgentLayoutContent title={title}>{children}</AgentLayoutContent>
    </ProtectedRoute>
  );
}
