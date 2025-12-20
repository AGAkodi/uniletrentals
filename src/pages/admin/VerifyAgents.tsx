import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronLeft, Shield, CheckCircle, XCircle, Clock, 
  User, Building2, MapPin, FileText, Eye, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/Navbar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import useSWR, { mutate } from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface AgentVerification {
  id: string;
  user_id: string;
  company_name: string | null;
  office_address: string | null;
  government_id_url: string | null;
  passport_photo_url: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  agent_id: string | null;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
}

export default function VerifyAgents() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<AgentVerification | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: pendingAgents, isLoading } = useSWR<AgentVerification[]>(
    'all-pending-agents',
    async () => {
      const { data, error } = await supabase
        .from('agent_verifications')
        .select('*, user:profiles!agent_verifications_user_id_fkey(*)')
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AgentVerification[];
    }
  );

  const handleApprove = async (agent: AgentVerification) => {
    if (!profile) return;
    setProcessing(agent.id);

    try {
      // Generate agent ID
      const { data: agentIdData } = await supabase.rpc('generate_agent_id');
      
      const { error } = await supabase
        .from('agent_verifications')
        .update({
          verification_status: 'approved',
          agent_id: agentIdData,
          verified_at: new Date().toISOString(),
          verified_by: profile.id,
        })
        .eq('id', agent.id);

      if (error) throw error;

      // Create notification for agent
      await supabase.from('notifications').insert({
        user_id: agent.user_id,
        title: 'Verification Approved!',
        message: `Congratulations! Your agent verification has been approved. Your Agent ID is ${agentIdData}. You can now list properties.`,
        type: 'success',
      });

      toast({ title: 'Agent approved!', description: `Agent ID: ${agentIdData}` });
      mutate('all-pending-agents');
      mutate('admin-stats');
      setSelectedAgent(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (agent: AgentVerification) => {
    if (!profile) return;
    setProcessing(agent.id);

    try {
      const { error } = await supabase
        .from('agent_verifications')
        .update({
          verification_status: 'rejected',
          verified_at: new Date().toISOString(),
          verified_by: profile.id,
        })
        .eq('id', agent.id);

      if (error) throw error;

      // Create notification for agent
      await supabase.from('notifications').insert({
        user_id: agent.user_id,
        title: 'Verification Rejected',
        message: rejectionReason || 'Your verification was rejected. Please upload clearer documents and try again.',
        type: 'error',
      });

      toast({ title: 'Agent rejected' });
      mutate('all-pending-agents');
      mutate('admin-stats');
      setSelectedAgent(null);
      setRejectionReason('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/admin">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Agent Verifications</h1>
            <p className="text-muted-foreground">Review and approve agent verification requests</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : pendingAgents && pendingAgents.length > 0 ? (
          <div className="space-y-4">
            {pendingAgents.map((agent) => (
              <Card key={agent.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{agent.user?.full_name}</h3>
                        <p className="text-muted-foreground">{agent.user?.email}</p>
                        <p className="text-sm text-muted-foreground">{agent.user?.phone}</p>
                        {agent.company_name && (
                          <div className="flex items-center gap-1 mt-1 text-sm">
                            <Building2 className="h-4 w-4" />
                            {agent.company_name}
                          </div>
                        )}
                        {agent.office_address && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {agent.office_address}
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          {agent.government_id_url && (
                            <Badge variant="outline" className="gap-1">
                              <FileText className="h-3 w-3" />
                              ID Uploaded
                            </Badge>
                          )}
                          {agent.passport_photo_url && (
                            <Badge variant="outline" className="gap-1">
                              <User className="h-3 w-3" />
                              Photo Uploaded
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedAgent(agent)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Review Agent: {agent.user?.full_name}</DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Full Name</p>
                                <p className="font-medium">{agent.user?.full_name}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{agent.user?.email}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Phone</p>
                                <p className="font-medium">{agent.user?.phone || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Company</p>
                                <p className="font-medium">{agent.company_name || 'Individual'}</p>
                              </div>
                            </div>

                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Office Address</p>
                              <p className="font-medium">{agent.office_address || 'N/A'}</p>
                            </div>

                            {agent.government_id_url && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Government ID</p>
                                <img 
                                  src={agent.government_id_url} 
                                  alt="Government ID" 
                                  className="max-w-full h-auto rounded-lg border"
                                />
                              </div>
                            )}

                            {agent.passport_photo_url && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Passport Photo</p>
                                <img 
                                  src={agent.passport_photo_url} 
                                  alt="Passport Photo" 
                                  className="max-w-[200px] h-auto rounded-lg border"
                                />
                              </div>
                            )}

                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Rejection Reason (optional)</p>
                              <Textarea
                                placeholder="Enter reason if rejecting..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                              />
                            </div>

                            <div className="flex gap-3">
                              <Button 
                                className="flex-1" 
                                onClick={() => handleApprove(agent)}
                                disabled={processing === agent.id}
                              >
                                {processing === agent.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Approve Agent
                              </Button>
                              <Button 
                                variant="destructive" 
                                className="flex-1"
                                onClick={() => handleReject(agent)}
                                disabled={processing === agent.id}
                              >
                                {processing === agent.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <XCircle className="h-4 w-4 mr-2" />
                                )}
                                Reject
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-accent mb-4" />
              <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
              <p className="text-muted-foreground">No pending agent verifications at the moment.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}