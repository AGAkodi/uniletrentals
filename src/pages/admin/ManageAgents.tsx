import { useState } from 'react';
import {
  Users, Shield, Ban, Clock, CheckCircle, XCircle,
  Search, AlertTriangle, Calendar, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Navbar } from '@/components/layout/Navbar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { sendEmail } from '@/lib/email';
import { useAuth } from '@/lib/auth';
import { format, addDays, addWeeks, addMonths, isPast } from 'date-fns';

interface VerifiedAgent {
  id: string;
  user_id: string;
  agent_id: string | null;
  company_name: string | null;
  verification_status: string;
  is_suspended: boolean | null;
  suspended_until: string | null;
  suspension_reason: string | null;
  suspended_at: string | null;
  verified_at: string | null;
  user: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  };
  property_count?: number;
}

function ManageAgentsContent() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<VerifiedAgent | null>(null);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [liftSuspensionDialogOpen, setLiftSuspensionDialogOpen] = useState(false);
  const [suspensionDuration, setSuspensionDuration] = useState('7_days');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const { data: agents, mutate } = useSWR('verified-agents', async () => {
    const { data, error } = await supabase
      .from('agent_verifications')
      .select(`
        *,
        user:profiles!agent_verifications_user_id_fkey(*)
      `)
      .eq('verification_status', 'approved')
      .order('verified_at', { ascending: false });

    if (error) throw error;

    // Get property counts for each agent
    const agentsWithCounts = await Promise.all(
      (data || []).map(async (agent) => {
        const { count } = await supabase
          .from('properties')
          .select('id', { count: 'exact' })
          .eq('agent_id', agent.user_id);
        return { ...agent, property_count: count || 0 };
      })
    );

    return agentsWithCounts as VerifiedAgent[];
  });

  const filteredAgents = agents?.filter(agent => {
    const query = searchQuery.toLowerCase();
    return (
      agent.user?.full_name?.toLowerCase().includes(query) ||
      agent.user?.email?.toLowerCase().includes(query) ||
      agent.agent_id?.toLowerCase().includes(query) ||
      agent.company_name?.toLowerCase().includes(query)
    );
  });

  const calculateSuspensionEndDate = (duration: string): Date => {
    const now = new Date();
    switch (duration) {
      case '7_days': return addDays(now, 7);
      case '14_days': return addDays(now, 14);
      case '30_days': return addMonths(now, 1);
      case '90_days': return addMonths(now, 3);
      case '6_months': return addMonths(now, 6);
      case '1_year': return addMonths(now, 12);
      case 'indefinite': return addMonths(now, 100); // ~100 months as "indefinite"
      default: return addDays(now, 7);
    }
  };

  const handleSuspendAgent = async () => {
    if (!selectedAgent || !suspensionReason.trim()) {
      toast.error('Please provide a reason for suspension');
      return;
    }

    setProcessing(true);
    try {
      const suspendedUntil = calculateSuspensionEndDate(suspensionDuration);

      const { error } = await supabase
        .from('agent_verifications')
        .update({
          is_suspended: true,
          suspended_until: suspendedUntil.toISOString(),
          suspension_reason: suspensionReason,
          suspended_at: new Date().toISOString(),
          suspended_by: user?.id,
        })
        .eq('id', selectedAgent.id);

      if (error) throw error;

      // Create notification for the agent
      await supabase.from('notifications').insert({
        user_id: selectedAgent.user_id,
        recipient_role: 'agent',
        type: 'suspension',
        title: 'Account Suspended',
        message: `Your agent account has been suspended until ${format(suspendedUntil, 'PPP')}. Reason: ${suspensionReason}`,
        link: '/agent/profile',
      });

      try {
        await sendEmail({
          to: selectedAgent.user.email,
          name: selectedAgent.user.full_name,
          type: 'suspension',
          status: 'suspended',
          reason: suspensionReason,
          endDate: suspendedUntil.toISOString()
        });
      } catch (e) {
        console.error('Failed to send suspension email:', e);
      }

      toast.success(`Agent ${selectedAgent.user?.full_name} has been suspended`);
      setSuspendDialogOpen(false);
      setSuspensionReason('');
      setSuspensionDuration('7_days');
      setSelectedAgent(null);
      mutate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to suspend agent');
    } finally {
      setProcessing(false);
    }
  };

  const handleLiftSuspension = async () => {
    if (!selectedAgent) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('agent_verifications')
        .update({
          is_suspended: false,
          suspended_until: null,
          suspension_reason: null,
          suspended_at: null,
          suspended_by: null,
        })
        .eq('id', selectedAgent.id);

      if (error) throw error;

      // Create notification for the agent
      await supabase.from('notifications').insert({
        user_id: selectedAgent.user_id,
        recipient_role: 'agent',
        type: 'suspension_lifted',
        title: 'Suspension Lifted',
        message: 'Your agent account suspension has been lifted. You can now access all agent features.',
        link: '/agent/dashboard',
      });

      try {
        await sendEmail({
          to: selectedAgent.user.email,
          name: selectedAgent.user.full_name,
          type: 'suspension',
          status: 'lifted'
        });
      } catch (e) {
        console.error('Failed to send suspension lifted email:', e);
      }

      toast.success(`Suspension lifted for ${selectedAgent.user?.full_name}`);
      setLiftSuspensionDialogOpen(false);
      setSelectedAgent(null);
      mutate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to lift suspension');
    } finally {
      setProcessing(false);
    }
  };

  const handleRevokeVerification = async () => {
    if (!selectedAgent || !revokeReason.trim()) {
      toast.error('Please provide a reason for revocation');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('agent_verifications')
        .update({
          verification_status: 'rejected',
          rejection_reason: revokeReason,
          agent_id: null,
          is_suspended: false,
          suspended_until: null,
          suspension_reason: null,
        })
        .eq('id', selectedAgent.id);

      if (error) throw error;

      // Create notification for the agent
      await supabase.from('notifications').insert({
        user_id: selectedAgent.user_id,
        recipient_role: 'agent',
        type: 'verification_revoked',
        title: 'Verification Revoked',
        message: `Your agent verification has been revoked. Reason: ${revokeReason}. You will need to re-apply for verification.`,
        link: '/agent/verification',
      });

      toast.success(`Verification revoked for ${selectedAgent.user?.full_name}`);
      setRevokeDialogOpen(false);
      setRevokeReason('');
      setSelectedAgent(null);
      mutate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke verification');
    } finally {
      setProcessing(false);
    }
  };

  const getAgentStatus = (agent: VerifiedAgent) => {
    if (agent.is_suspended) {
      if (agent.suspended_until && isPast(new Date(agent.suspended_until))) {
        return { label: 'Suspension Expired', variant: 'warning' as const };
      }
      return { label: 'Suspended', variant: 'destructive' as const };
    }
    return { label: 'Active', variant: 'success' as const };
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />

      <main className="pt-8 px-6 md:px-8 lg:px-12 pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold font-display flex items-center gap-3">
                <Users className="icon-lg" />
                Manage Agents
              </h1>
              <p className="text-muted-foreground mt-1">
                Suspend or revoke verified agent accounts
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 icon-sm text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or Agent ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Verified Agents</p>
                    <p className="text-3xl font-bold">{agents?.length || 0}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="icon-lg icon-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Agents</p>
                    <p className="text-3xl font-bold">
                      {agents?.filter(a => !a.is_suspended).length || 0}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <CheckCircle className="icon-lg icon-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Suspended Agents</p>
                    <p className="text-3xl font-bold">
                      {agents?.filter(a => a.is_suspended).length || 0}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <Ban className="icon-lg icon-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agents List */}
          <Card>
            <CardHeader>
              <CardTitle>Verified Agents</CardTitle>
              <CardDescription>
                Manage verified agents - suspend for violations or revoke verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAgents && filteredAgents.length > 0 ? (
                <div className="space-y-4">
                  {filteredAgents.map((agent) => {
                    const status = getAgentStatus(agent);
                    return (
                      <div
                        key={agent.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-secondary/50 gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={agent.user?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {agent.user?.full_name?.charAt(0) || 'A'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{agent.user?.full_name}</p>
                              <Badge
                                variant={status.variant === 'success' ? 'default' : status.variant === 'warning' ? 'outline' : 'destructive'}
                              >
                                {status.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{agent.user?.email}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              {agent.agent_id && (
                                <span className="flex items-center gap-1">
                                  <Shield className="h-3 w-3" />
                                  {agent.agent_id}
                                </span>
                              )}
                              {agent.company_name && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {agent.company_name}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {agent.property_count} listings
                              </span>
                            </div>
                            {agent.is_suspended && agent.suspended_until && (
                              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Suspended until: {format(new Date(agent.suspended_until), 'PPP')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {agent.is_suspended ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAgent(agent);
                                setLiftSuspensionDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="icon-sm mr-1" />
                              Lift Suspension
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-warning border-warning hover:bg-warning/10"
                              onClick={() => {
                                setSelectedAgent(agent);
                                setSuspendDialogOpen(true);
                              }}
                            >
                              <Clock className="icon-sm mr-1" />
                              Suspend
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedAgent(agent);
                              setRevokeDialogOpen(true);
                            }}
                          >
                            <XCircle className="icon-sm mr-1" />
                            Revoke Verification
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="icon-xl mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No agents found matching your search' : 'No verified agents yet'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Suspend Agent Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="icon-md text-warning" />
              Suspend Agent
            </DialogTitle>
            <DialogDescription>
              Suspend {selectedAgent?.user?.full_name}'s agent account. They will not be able to access agent features during the suspension period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Suspension Duration</Label>
              <Select value={suspensionDuration} onValueChange={setSuspensionDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7_days">7 Days</SelectItem>
                  <SelectItem value="14_days">14 Days</SelectItem>
                  <SelectItem value="30_days">30 Days</SelectItem>
                  <SelectItem value="90_days">90 Days</SelectItem>
                  <SelectItem value="6_months">6 Months</SelectItem>
                  <SelectItem value="1_year">1 Year</SelectItem>
                  <SelectItem value="indefinite">Indefinite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason for Suspension *</Label>
              <Textarea
                placeholder="Explain why this agent is being suspended..."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              onClick={handleSuspendAgent}
              disabled={processing || !suspensionReason.trim()}
            >
              {processing ? 'Suspending...' : 'Suspend Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lift Suspension Dialog */}
      <Dialog open={liftSuspensionDialogOpen} onOpenChange={setLiftSuspensionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="icon-md text-accent" />
              Lift Suspension
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to lift the suspension for {selectedAgent?.user?.full_name}? They will regain full access to agent features.
            </DialogDescription>
          </DialogHeader>

          {selectedAgent?.suspension_reason && (
            <div className="bg-secondary/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Original suspension reason:</p>
              <p className="text-sm mt-1">{selectedAgent.suspension_reason}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLiftSuspensionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLiftSuspension} disabled={processing}>
              {processing ? 'Processing...' : 'Lift Suspension'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Verification Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="icon-md" />
              Revoke Agent Verification
            </DialogTitle>
            <DialogDescription>
              This will permanently revoke {selectedAgent?.user?.full_name}'s verified status and remove their Agent ID. They will need to re-apply for verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
              <p className="text-sm font-medium text-destructive">Warning: This action cannot be undone</p>
              <p className="text-sm text-muted-foreground mt-1">
                The agent will lose their Agent ID ({selectedAgent?.agent_id}) and all associated privileges.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Reason for Revocation *</Label>
              <Textarea
                placeholder="Explain why this agent's verification is being revoked..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeVerification}
              disabled={processing || !revokeReason.trim()}
            >
              {processing ? 'Revoking...' : 'Revoke Verification'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ManageAgents() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <ManageAgentsContent />
    </ProtectedRoute>
  );
}
