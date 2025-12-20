import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronLeft, Flag, CheckCircle, AlertTriangle, XCircle,
  User, Building2, Loader2, Ban, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/Navbar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import useSWR, { mutate } from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface Report {
  id: string;
  reporter_id: string;
  reported_agent_id: string | null;
  reported_property_id: string | null;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter: {
    full_name: string;
    email: string;
  };
  reported_agent?: {
    full_name: string;
    email: string;
  };
  reported_property?: {
    title: string;
    agent_id: string;
  };
}

export default function AdminReports() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [processing, setProcessing] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');

  const { data: reports, isLoading } = useSWR<Report[]>(
    'all-reports',
    async () => {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(full_name, email),
          reported_agent:profiles!reports_reported_agent_id_fkey(full_name, email),
          reported_property:properties!reports_reported_property_id_fkey(title, agent_id)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Report[];
    }
  );

  const handleResolve = async (report: Report) => {
    if (!profile) return;
    setProcessing(report.id);

    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: profile.id,
        })
        .eq('id', report.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: report.reporter_id,
        title: 'Report Resolved',
        message: resolution || 'Your report has been reviewed and resolved. Thank you for helping keep our platform safe.',
        type: 'info',
      });

      toast({ title: 'Report resolved' });
      mutate('all-reports');
      mutate('admin-stats');
      setResolution('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const handleSuspendListing = async (report: Report) => {
    if (!report.reported_property_id) return;
    setProcessing(report.id);

    try {
      await supabase
        .from('properties')
        .update({ status: 'rejected' })
        .eq('id', report.reported_property_id);

      await handleResolve(report);
      toast({ title: 'Listing suspended and report resolved' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return <Badge className="bg-accent text-accent-foreground">Resolved</Badge>;
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingReports = reports?.filter(r => r.status === 'pending') || [];
  const resolvedReports = reports?.filter(r => r.status === 'resolved') || [];

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
          <div className="h-12 w-12 rounded-xl bg-destructive flex items-center justify-center">
            <Flag className="h-6 w-6 text-destructive-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Reports & Safety</h1>
            <p className="text-muted-foreground">Manage reported properties and agents</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pending Reports */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Pending Reports ({pendingReports.length})
              </h2>
              
              {pendingReports.length > 0 ? (
                <div className="space-y-4">
                  {pendingReports.map((report) => (
                    <Card key={report.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {getStatusBadge(report.status)}
                              <span className="text-sm text-muted-foreground">
                                {new Date(report.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <h3 className="font-semibold text-lg">{report.reason}</h3>
                            {report.description && (
                              <p className="text-muted-foreground">{report.description}</p>
                            )}
                            
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>Reported by: {report.reporter?.full_name}</span>
                              </div>
                              {report.reported_agent && (
                                <div className="flex items-center gap-1 text-destructive">
                                  <User className="h-4 w-4" />
                                  <span>Agent: {report.reported_agent.full_name}</span>
                                </div>
                              )}
                              {report.reported_property && (
                                <div className="flex items-center gap-1 text-destructive">
                                  <Building2 className="h-4 w-4" />
                                  <span>Property: {report.reported_property.title}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline">Take Action</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Resolve Report</DialogTitle>
                              </DialogHeader>
                              
                              <div className="space-y-4 py-4">
                                <div>
                                  <p className="font-medium mb-1">Reason:</p>
                                  <p>{report.reason}</p>
                                </div>
                                {report.description && (
                                  <div>
                                    <p className="font-medium mb-1">Description:</p>
                                    <p className="text-muted-foreground">{report.description}</p>
                                  </div>
                                )}
                                
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Resolution Note</p>
                                  <Textarea
                                    placeholder="Add a note about how this was resolved..."
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value)}
                                  />
                                </div>

                                <div className="flex flex-col gap-2">
                                  {report.reported_property_id && (
                                    <Button 
                                      variant="destructive"
                                      onClick={() => handleSuspendListing(report)}
                                      disabled={processing === report.id}
                                    >
                                      {processing === report.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      ) : (
                                        <Ban className="h-4 w-4 mr-2" />
                                      )}
                                      Suspend Listing & Resolve
                                    </Button>
                                  )}
                                  <Button 
                                    onClick={() => handleResolve(report)}
                                    disabled={processing === report.id}
                                  >
                                    {processing === report.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                    )}
                                    Mark as Resolved
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto text-accent mb-4" />
                    <p className="text-muted-foreground">No pending reports</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Resolved Reports */}
            {resolvedReports.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-accent" />
                  Resolved Reports ({resolvedReports.length})
                </h2>
                
                <div className="space-y-4">
                  {resolvedReports.slice(0, 10).map((report) => (
                    <Card key={report.id} className="opacity-70">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusBadge(report.status)}
                              <span className="font-medium">{report.reason}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Reported by {report.reporter?.full_name} • {new Date(report.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}