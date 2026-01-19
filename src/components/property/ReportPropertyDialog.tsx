import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportPropertyDialogProps {
    propertyId: string;
    propertyTitle: string;
    agentId?: string;
    children: React.ReactNode;
}

export function ReportPropertyDialog({ propertyId, propertyTitle, agentId, children }: ReportPropertyDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!user) {
            toast({ title: 'Login required', description: 'Redirecting to signup...', });
            navigate('/auth/signup');
            return;
        }

        if (!reason) {
            toast({ title: 'Reason required', description: 'Please select a reason for the report.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);

        const { error } = await supabase
            .from('reports')
            .insert({
                reporter_id: user.id,
                reported_property_id: propertyId,
                reported_agent_id: agentId || null,
                reason: reason,
                description: description,
                status: 'pending'
            });

        setIsSubmitting(false);

        if (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to submit report. Please try again.', variant: 'destructive' });
            return;
        }

        toast({ title: 'Report Submitted', description: 'Thank you. We will review this listing shortly.' });
        setOpen(false);
        setReason('');
        setDescription('');
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen && !user) {
            toast({ title: 'Login required', description: 'You need to be logged in to report a property.' });
            navigate('/auth/signup');
            return;
        }
        setOpen(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Report Property
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Reporting: <span className="font-medium text-foreground">{propertyTitle}</span>
                    </p>

                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="scam">Scam / Fraud</SelectItem>
                                <SelectItem value="fake_property">Fake Property / Doesn't Exist</SelectItem>
                                <SelectItem value="wrong_info">Inaccurate Information</SelectItem>
                                <SelectItem value="duplicate">Duplicate Listing</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="Please provide more details..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="resize-none"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button
                        variant="destructive"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Submit Report
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
