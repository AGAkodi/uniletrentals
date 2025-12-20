import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronLeft, Shield, UserPlus, Trash2, Loader2, 
  CheckCircle, AlertTriangle, Crown, Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Navbar } from '@/components/layout/Navbar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import useSWR, { mutate } from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export default function ManageAdmins() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data: admins, isLoading } = useSWR<AdminUser[]>(
    'all-admins',
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .eq('role', 'admin')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as AdminUser[];
    }
  );

  const handlePromoteToAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({ title: 'Please enter an email address', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // Find the user by email
      const { data: userData, error: findError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (findError) throw findError;

      if (!userData) {
        toast({ 
          title: 'User not found', 
          description: 'No account exists with this email. The user must sign up first.',
          variant: 'destructive' 
        });
        setLoading(false);
        return;
      }

      if (userData.role === 'admin') {
        toast({ 
          title: 'Already an admin', 
          description: `${userData.full_name} is already an admin.`,
          variant: 'destructive' 
        });
        setLoading(false);
        return;
      }

      // Update profile role to admin
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userData.id);

      if (profileError) throw profileError;

      // Add to user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userData.id, 
          role: 'admin' 
        }, { 
          onConflict: 'user_id,role' 
        });

      if (roleError) {
        console.error('Role upsert error:', roleError);
      }

      // Notify the user
      await supabase.from('notifications').insert({
        user_id: userData.id,
        title: 'Admin Access Granted',
        message: 'You have been promoted to administrator. You now have full access to the admin dashboard.',
        type: 'success',
      });

      toast({ 
        title: 'Admin created!', 
        description: `${userData.full_name} is now an administrator.` 
      });
      
      setEmail('');
      mutate('all-admins');
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (admin: AdminUser) => {
    if (admin.id === profile?.id) {
      toast({ 
        title: 'Cannot remove yourself', 
        description: 'You cannot remove your own admin access.',
        variant: 'destructive' 
      });
      return;
    }

    if (admins && admins.length <= 1) {
      toast({ 
        title: 'Cannot remove last admin', 
        description: 'There must be at least one admin on the platform.',
        variant: 'destructive' 
      });
      return;
    }

    setRemovingId(admin.id);

    try {
      // Update profile role back to student
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'student' })
        .eq('id', admin.id);

      if (profileError) throw profileError;

      // Remove from user_roles table
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', admin.id)
        .eq('role', 'admin');

      // Notify the user
      await supabase.from('notifications').insert({
        user_id: admin.id,
        title: 'Admin Access Revoked',
        message: 'Your administrator access has been revoked. You no longer have access to the admin dashboard.',
        type: 'warning',
      });

      toast({ title: 'Admin removed', description: `${admin.full_name} is no longer an administrator.` });
      mutate('all-admins');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/admin">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <Crown className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Manage Administrators</h1>
            <p className="text-muted-foreground">Add or remove admin access for users</p>
          </div>
        </div>

        {/* Add New Admin */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Promote User to Admin
            </CardTitle>
            <CardDescription>
              Enter the email of an existing user to grant them admin access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePromoteToAdmin} className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="email" className="sr-only">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter user's email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Make Admin
              </Button>
            </form>
            <p className="text-sm text-muted-foreground mt-3">
              <AlertTriangle className="h-4 w-4 inline mr-1 text-warning" />
              The user must have an existing account before they can be promoted to admin.
            </p>
          </CardContent>
        </Card>

        {/* Current Admins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Current Administrators ({admins?.length || 0})
            </CardTitle>
            <CardDescription>
              All users with admin access to the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : admins && admins.length > 0 ? (
              <div className="space-y-4">
                {admins.map((admin) => (
                  <div 
                    key={admin.id} 
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {admin.full_name?.charAt(0) || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{admin.full_name}</p>
                          {admin.id === profile?.id && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Admin since {new Date(admin.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {admin.id !== profile?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={removingId === admin.id}
                          >
                            {removingId === admin.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-1" />
                                Remove
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Admin Access?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove admin access from <strong>{admin.full_name}</strong>? 
                              They will no longer be able to access the admin dashboard.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveAdmin(admin)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove Admin
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No administrators found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}