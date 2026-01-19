import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, Shield, UserPlus, Trash2, Loader2,
  CheckCircle, AlertTriangle, Crown, Mail, Settings
} from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const AVAILABLE_PERMISSIONS = [
  { id: 'super_admin', label: 'Super Admin', description: 'Full access to all system features' },
  { id: 'manage_blogs', label: 'Manage Blogs', description: 'Create, edit, and delete blog posts' },
  { id: 'manage_agents', label: 'Verify Agents', description: 'Approve or reject agent verification requests' },
  { id: 'manage_listings', label: 'Approve Listings', description: 'Review and approve pending property listings' },
  { id: 'manage_reports', label: 'Manage Reports', description: 'View and resolve user reports' },
  { id: 'manage_admins', label: 'Manage Admins', description: 'Add or remove other administrators' },
];

export default function ManageAdmins() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Permissions State
  const [editingPermissionsId, setEditingPermissionsId] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  const { data: admins, isLoading } = useSWR<AdminUser[]>(
    'all-admins',
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at, permissions')
        .eq('role', 'admin')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as AdminUser[];
    }
  );

  const handleOpenPermissions = (admin: AdminUser) => {
    setEditingPermissionsId(admin.id);
    setSelectedPermissions(admin.permissions || []);
  };

  const handleTogglePermission = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSavePermissions = async () => {
    if (!editingPermissionsId) return;
    setIsSavingPermissions(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ permissions: selectedPermissions })
        .eq('id', editingPermissionsId);

      if (error) throw error;

      toast({ title: 'Permissions updated', description: 'Admin permissions have been saved.' });
      mutate('all-admins');
      setEditingPermissionsId(null);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to save permissions.', variant: 'destructive' });
    } finally {
      setIsSavingPermissions(false);
    }
  };

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

  // Check if current user is Super Admin
  const isSuperAdmin = profile?.permissions?.includes('super_admin');

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/admin/dashboard">
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

        {/* Add New Admin - Only Super Admin */}
        {isSuperAdmin && (
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
        )}

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
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-secondary/50 gap-4"
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

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {/* Manage Permissions Button - Only Super Admin */}
                      {isSuperAdmin && (
                        <Dialog open={editingPermissionsId === admin.id} onOpenChange={(open) => !open && setEditingPermissionsId(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPermissions(admin)}
                              className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border-primary/20"
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Delegate Task
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Delegate Admin Tasks</DialogTitle>
                              <DialogDescription>
                                Select the specific functions that <strong>{admin.full_name}</strong> is allowed to perform.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                              {AVAILABLE_PERMISSIONS.map((permission) => (
                                <div key={permission.id} className="flex items-start space-x-3">
                                  <Checkbox
                                    id={permission.id}
                                    checked={selectedPermissions.includes(permission.id)}
                                    onCheckedChange={() => handleTogglePermission(permission.id)}
                                  />
                                  <div className="grid gap-1.5 leading-none">
                                    <Label
                                      htmlFor={permission.id}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                      {permission.label}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      {permission.description}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingPermissionsId(null)}>Cancel</Button>
                              <Button onClick={handleSavePermissions} disabled={isSavingPermissions}>
                                {isSavingPermissions && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Save Changes
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}

                      {/* Remove Admin Button - Only Super Admin */}
                      {isSuperAdmin && admin.id !== profile?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={removingId === admin.id}
                            >
                              {removingId === admin.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
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