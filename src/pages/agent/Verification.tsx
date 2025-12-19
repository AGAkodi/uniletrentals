import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Upload, FileCheck, Clock, CheckCircle, 
  XCircle, Loader2, User, IdCard, Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import useSWR, { mutate } from 'swr';

interface VerificationData {
  id: string;
  user_id: string;
  company_name: string | null;
  office_address: string | null;
  government_id_url: string | null;
  passport_photo_url: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  agent_id: string | null;
  verified_at: string | null;
}

export default function AgentVerification() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  
  const [governmentIdFile, setGovernmentIdFile] = useState<File | null>(null);
  const [passportPhotoFile, setPassportPhotoFile] = useState<File | null>(null);
  const [governmentIdPreview, setGovernmentIdPreview] = useState<string | null>(null);
  const [passportPhotoPreview, setPassportPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: verification, isLoading } = useSWR<VerificationData | null>(
    profile?.id ? `agent-verification-${profile.id}` : null,
    async () => {
      const { data } = await supabase
        .from('agent_verifications')
        .select('*')
        .eq('user_id', profile!.id)
        .maybeSingle();
      return data as VerificationData | null;
    }
  );

  useEffect(() => {
    if (verification?.government_id_url) {
      setGovernmentIdPreview(verification.government_id_url);
    }
    if (verification?.passport_photo_url) {
      setPassportPhotoPreview(verification.passport_photo_url);
    }
  }, [verification]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    type: 'government_id' | 'passport_photo'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast({ title: 'Only images and PDFs are allowed', variant: 'destructive' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File must be less than 10MB', variant: 'destructive' });
      return;
    }

    if (type === 'government_id') {
      setGovernmentIdFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setGovernmentIdPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setGovernmentIdPreview(null);
      }
    } else {
      setPassportPhotoFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPassportPhotoPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setPassportPhotoPreview(null);
      }
    }
  };

  const uploadFile = async (file: File, type: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile?.id}/${type}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('agent-docs')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('agent-docs')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!profile) return;

    if (!governmentIdFile && !verification?.government_id_url) {
      toast({ title: 'Please upload your National ID', variant: 'destructive' });
      return;
    }

    if (!passportPhotoFile && !verification?.passport_photo_url) {
      toast({ title: 'Please upload your passport photo', variant: 'destructive' });
      return;
    }

    setUploading(true);

    try {
      let governmentIdUrl = verification?.government_id_url;
      let passportPhotoUrl = verification?.passport_photo_url;

      if (governmentIdFile) {
        governmentIdUrl = await uploadFile(governmentIdFile, 'government-id');
      }

      if (passportPhotoFile) {
        passportPhotoUrl = await uploadFile(passportPhotoFile, 'passport-photo');
      }

      const { error } = await supabase
        .from('agent_verifications')
        .update({
          government_id_url: governmentIdUrl,
          passport_photo_url: passportPhotoUrl,
          verification_status: 'pending',
        })
        .eq('user_id', profile.id);

      if (error) throw error;

      // Refresh the data
      mutate(`agent-verification-${profile.id}`);

      toast({ 
        title: 'Documents uploaded!', 
        description: 'Your verification is pending admin review.' 
      });
    } catch (error: any) {
      toast({ 
        title: 'Upload failed', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          icon: CheckCircle,
          color: 'text-accent',
          bg: 'bg-accent/10',
          label: 'Verified',
          description: 'Your account has been verified. You can now list properties.'
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-destructive',
          bg: 'bg-destructive/10',
          label: 'Rejected',
          description: 'Your verification was rejected. Please upload clearer documents.'
        };
      default:
        return {
          icon: Clock,
          color: 'text-warning',
          bg: 'bg-warning/10',
          label: 'Pending',
          description: 'Your verification is under review. This usually takes 1-2 business days.'
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusConfig = getStatusConfig(verification?.verification_status || 'pending');
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/agent')}
          className="mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <FileCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Agent Verification</h1>
            <p className="text-muted-foreground">Upload documents to verify your identity</p>
          </div>
        </div>

        {/* Status Card */}
        <Card className={`mb-8 border-2 ${statusConfig.bg}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-full ${statusConfig.bg} flex items-center justify-center`}>
                <StatusIcon className={`h-7 w-7 ${statusConfig.color}`} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">{statusConfig.label}</p>
                <p className="text-muted-foreground">{statusConfig.description}</p>
              </div>
            </div>
            {verification?.agent_id && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Your Agent ID</p>
                <p className="font-mono text-xl font-bold text-primary">{verification.agent_id}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>This information is from your signup and cannot be changed here.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="bg-secondary/50 rounded-lg p-4">
                <Label className="text-muted-foreground text-sm">Full Name</Label>
                <p className="font-semibold text-lg">{profile?.full_name || 'Not provided'}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <Label className="text-muted-foreground text-sm">Email</Label>
                <p className="font-semibold text-lg">{profile?.email || 'Not provided'}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <Label className="text-muted-foreground text-sm">Phone Number</Label>
                <p className="font-semibold text-lg">{profile?.phone || 'Not provided'}</p>
              </div>
              {verification?.company_name && (
                <div className="bg-secondary/50 rounded-lg p-4">
                  <Label className="text-muted-foreground text-sm">Company Name</Label>
                  <p className="font-semibold text-lg">{verification.company_name}</p>
                </div>
              )}
              {verification?.office_address && (
                <div className="bg-secondary/50 rounded-lg p-4">
                  <Label className="text-muted-foreground text-sm">Office Address</Label>
                  <p className="font-semibold text-lg">{verification.office_address}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Document Uploads */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IdCard className="h-5 w-5" />
              National ID Card / Slip
            </CardTitle>
            <CardDescription>
              Upload a clear photo of your National ID Card, Voter's Card, or Driver's License
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {governmentIdPreview && (
                <div className="relative rounded-lg overflow-hidden border bg-muted">
                  <img 
                    src={governmentIdPreview} 
                    alt="Government ID Preview" 
                    className="w-full h-48 object-contain"
                  />
                </div>
              )}
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  {governmentIdFile ? governmentIdFile.name : 'Click to upload National ID'}
                </span>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileChange(e, 'government_id')}
                  className="hidden"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Passport Photograph
            </CardTitle>
            <CardDescription>
              Upload a recent passport-sized photograph with clear face visibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {passportPhotoPreview && (
                <div className="relative rounded-lg overflow-hidden border bg-muted flex justify-center">
                  <img 
                    src={passportPhotoPreview} 
                    alt="Passport Photo Preview" 
                    className="h-48 object-contain"
                  />
                </div>
              )}
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  {passportPhotoFile ? passportPhotoFile.name : 'Click to upload Passport Photo'}
                </span>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'passport_photo')}
                  className="hidden"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        {verification?.verification_status !== 'approved' && (
          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            size="lg"
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Uploading Documents...
              </>
            ) : (
              'Submit for Verification'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
