import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, Shield, CheckCircle, XCircle, Clock,
  User, Building2, MapPin, FileText, Eye, Loader2, Download, FileArchive, AlertTriangle, Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/Navbar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import useSWR, { mutate } from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

interface AgentVerification {
  id: string;
  user_id: string;
  company_name: string | null;
  office_address: string | null;
  government_id_url: string | null;
  passport_photo_url: string | null;
  zip_file_url: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  agent_id: string | null;
  created_at: string;
  submitted_at: string | null;
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  const { data: pendingAgents, isLoading } = useSWR<AgentVerification[]>(
    'all-pending-agents',
    async () => {
      const { data, error } = await supabase
        .from('agent_verifications')
        .select('*, user:profiles!agent_verifications_user_id_fkey(*)')
        .eq('verification_status', 'pending')
        .order('submitted_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as AgentVerification[];
    }
  );

  const handleDownloadZip = async (zipFilePath: string, agentName: string) => {
    try {
      // Create a signed URL for the private bucket (valid for 1 hour)
      const { data, error } = await supabase.storage
        .from('agent-docs')
        .createSignedUrl(zipFilePath, 3600);

      if (error) {
        // If file path is already a full URL (legacy), try direct download
        if (zipFilePath.startsWith('http')) {
          window.open(zipFilePath, '_blank');
          return;
        }
        throw error;
      }

      // Open the signed URL in a new tab for download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = `${agentName.replace(/\s+/g, '_')}_verification_docs.zip`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message || 'Could not generate download link',
        variant: 'destructive'
      });
    }
  };

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

      // Send email notification (admin-only)
      try {
        const emailResult = await sendEmail({
          to: agent.user?.email || '',
          name: agent.user?.full_name || '',
          type: 'verification',
          status: 'approved',
          agentId: agentIdData
        });
        if (!emailResult.success) {
          console.warn('Email notification failed:', emailResult.error);
        }
      } catch (emailError: any) {
        console.warn('Email notification failed, but verification was successful:', emailError.message);
      }

      toast({ title: 'Agent approved!', description: `Agent ID: ${agentIdData}` });
      mutate('all-pending-agents');
      mutate('admin-stats');
      setDialogOpen(false);
      setSelectedAgent(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (agent: AgentVerification) => {
    if (!profile) return;

    if (!rejectionReason.trim()) {
      toast({
        title: 'Rejection reason required',
        description: 'Please provide a reason for rejecting this agent.',
        variant: 'destructive'
      });
      return;
    }

    setProcessing(agent.id);

    try {
      const { error } = await supabase
        .from('agent_verifications')
        .update({
          verification_status: 'rejected',
          rejection_reason: rejectionReason,
          verified_at: new Date().toISOString(),
          verified_by: profile.id,
        })
        .eq('id', agent.id);

      if (error) throw error;

      // Send rejection email (admin-only)
      try {
        const emailResult = await sendEmail({
          to: agent.user?.email || '',
          name: agent.user?.full_name || '',
          type: 'verification',
          status: 'rejected',
          rejectionReason: rejectionReason
        });
        if (!emailResult.success) {
          console.warn('Email notification failed:', emailResult.error);
        }
      } catch (emailError) {
        console.log('Email notification failed, but rejection was recorded');
      }

      toast({ title: 'Agent rejected', description: 'The agent has been notified.' });
      mutate('all-pending-agents');
      mutate('admin-stats');
      setDialogOpen(false);
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
          <Link to="/admin/dashboard">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Agent Verifications</h1>
              <p className="text-muted-foreground">Review and approve agent verification requests</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              if (!profile?.email) {
                toast({
                  title: 'Error',
                  description: 'No email address found',
                  variant: 'destructive'
                });
                return;
              }
              setTestingEmail(true);
              try {
                const result = await sendEmail({
                  to: profile.email,
                  name: profile.full_name || 'Admin',
                  type: 'verification',
                  status: 'approved',
                  agentId: 'TEST-AGENT-123'
                });
                if (result.success) {
                  toast({
                    title: 'Test email sent!',
                    description: `Verification approval email sent to ${profile.email}`
                  });
                } else {
                  toast({
                    title: 'Failed',
                    description: result.error || 'Unknown error',
                    variant: 'destructive'
                  });
                }
              } catch (error: any) {
                toast({
                  title: 'Error',
                  description: error.message || 'Failed to send test email',
                  variant: 'destructive'
                });
              } finally {
                setTestingEmail(false);
              }
            }}
            disabled={testingEmail || !profile?.email}
          >
            {testingEmail ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Test Verification Email
              </>
            )}
          </Button>
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
                          {agent.zip_file_url && (
                            <Badge variant="default" className="gap-1 bg-accent">
                              <FileArchive className="h-3 w-3" />
                              Documents Uploaded
                            </Badge>
                          )}
                          {agent.submitted_at && (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(agent.submitted_at).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {agent.zip_file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadZip(agent.zip_file_url!, agent.user?.full_name || 'agent')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download ZIP
                        </Button>
                      )}
                      <Dialog open={dialogOpen && selectedAgent?.id === agent.id} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) {
                          setSelectedAgent(null);
                          setRejectionReason('');
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAgent(agent);
                              setDialogOpen(true);
                            }}
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

                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Signup Date</p>
                              <p className="font-medium">{new Date(agent.created_at).toLocaleString()}</p>
                            </div>

                            {agent.submitted_at && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Documents Submitted</p>
                                <p className="font-medium">{new Date(agent.submitted_at).toLocaleString()}</p>
                              </div>
                            )}

                            {/* ZIP File Download */}
                            {agent.zip_file_url ? (
                              <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <FileArchive className="h-8 w-8 text-accent" />
                                    <div>
                                      <p className="font-medium">Verification Documents</p>
                                      <p className="text-sm text-muted-foreground">ZIP archive with all uploaded documents</p>
                                    </div>
                                  </div>
                                  <Button
                                    onClick={() => handleDownloadZip(agent.zip_file_url!, agent.user?.full_name || 'agent')}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                                <div className="flex items-center gap-3">
                                  <AlertTriangle className="h-6 w-6 text-warning" />
                                  <div>
                                    <p className="font-medium text-warning">No Documents Uploaded</p>
                                    <p className="text-sm text-muted-foreground">
                                      This agent has not uploaded verification documents yet.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Legacy image previews for backwards compatibility */}
                            {agent.government_id_url && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Government ID (Legacy)</p>
                                <img
                                  src={agent.government_id_url}
                                  alt="Government ID"
                                  className="max-w-full h-auto rounded-lg border"
                                />
                              </div>
                            )}

                            {agent.passport_photo_url && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">Passport Photo (Legacy)</p>
                                <img
                                  src={agent.passport_photo_url}
                                  alt="Passport Photo"
                                  className="max-w-[200px] h-auto rounded-lg border"
                                />
                              </div>
                            )}

                            <div className="space-y-2">
                              <Label htmlFor="rejectionReason" className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                                Rejection Reason (Required for rejection)
                              </Label>
                              <Textarea
                                id="rejectionReason"
                                placeholder="Enter a clear reason if you are rejecting this agent..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="min-h-[100px]"
                              />
                              <p className="text-xs text-muted-foreground">
                                This message will be sent to the agent via email and shown in their dashboard.
                              </p>
                            </div>

                            <div className="flex gap-3">
                              <Button
                                className="flex-1"
                                onClick={() => handleApprove(agent)}
                                disabled={processing === agent.id || !agent.zip_file_url}
                              >
                                {processing === agent.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Verify Agent
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
                                Reject Agent
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
