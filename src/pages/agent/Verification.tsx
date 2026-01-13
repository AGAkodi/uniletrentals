import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Upload, FileCheck, Clock, CheckCircle, 
  XCircle, Loader2, User, IdCard, Camera, FileArchive, X, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import useSWR, { mutate } from 'swr';
import JSZip from 'jszip';

interface VerificationData {
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
  verified_at: string | null;
  submitted_at: string | null;
}

interface UploadedFile {
  file: File;
  preview: string | null;
  type: 'government_id' | 'passport' | 'other';
}

export default function AgentVerification() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
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

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    type: 'government_id' | 'passport' | 'other'
  ) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast({ title: 'Only images and PDFs are allowed', variant: 'destructive' });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'File must be less than 10MB', variant: 'destructive' });
        return;
      }

      let preview: string | null = null;
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadedFiles(prev => [...prev, { 
            file, 
            preview: reader.result as string, 
            type 
          }]);
        };
        reader.readAsDataURL(file);
      } else {
        setUploadedFiles(prev => [...prev, { file, preview: null, type }]);
      }
    });

    // Reset input
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const createZipAndUpload = async (): Promise<string> => {
    const zip = new JSZip();
    
    // Add all files to ZIP
    for (const uploadedFile of uploadedFiles) {
      const folder = zip.folder(uploadedFile.type);
      if (folder) {
        folder.file(uploadedFile.file.name, uploadedFile.file);
      } else {
        zip.file(`${uploadedFile.type}/${uploadedFile.file.name}`, uploadedFile.file);
      }
    }
    
    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Upload to Supabase storage
    const fileName = `${profile?.id}/verification-${Date.now()}.zip`;
    
    const { error: uploadError } = await supabase.storage
      .from('agent-docs')
      .upload(fileName, zipBlob, { 
        upsert: true,
        contentType: 'application/zip'
      });

    if (uploadError) throw uploadError;

    // Return the file path for storage (bucket is private, we'll use signed URLs for download)
    return fileName;
  };

  const handleSubmit = async () => {
    if (!profile) return;

    // Validate required documents
    const hasGovernmentId = uploadedFiles.some(f => f.type === 'government_id');
    const hasPassport = uploadedFiles.some(f => f.type === 'passport');

    if (!hasGovernmentId) {
      toast({ title: 'Please upload your Government ID (National ID)', variant: 'destructive' });
      return;
    }

    if (!hasPassport) {
      toast({ title: 'Please upload your Passport Photograph', variant: 'destructive' });
      return;
    }

    setUploading(true);

    try {
      // Create ZIP and upload
      const zipFilePath = await createZipAndUpload();

      // Update verification record
      const { error } = await supabase
        .from('agent_verifications')
        .update({
          zip_file_url: zipFilePath,
          verification_status: 'pending',
          submitted_at: new Date().toISOString(),
        })
        .eq('user_id', profile.id);

      if (error) throw error;

      // Send notification to admins
      try {
        await supabase.functions.invoke('send-verification-email', {
          body: {
            email: profile.email,
            name: profile.full_name,
            status: 'submitted',
          }
        });
      } catch (emailError) {
        console.log('Admin notification failed, but documents were submitted successfully');
      }

      // Refresh the data
      mutate(`agent-verification-${profile.id}`);

      toast({ 
        title: 'Documents submitted!', 
        description: 'Your verification is pending admin review. You will be notified once reviewed.' 
      });
      
      // Clear uploaded files
      setUploadedFiles([]);
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
          border: 'border-accent',
          label: 'Verified',
          description: 'Your account has been verified. You can now list properties.'
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-destructive',
          bg: 'bg-destructive/10',
          border: 'border-destructive',
          label: 'Rejected',
          description: 'Your verification was rejected. Please review the reason and resubmit with clearer documents.'
        };
      default:
        return {
          icon: Clock,
          color: 'text-warning',
          bg: 'bg-warning/10',
          border: 'border-warning',
          label: 'Pending Review',
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
  const hasSubmitted = !!verification?.zip_file_url || !!verification?.submitted_at;

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/agent/dashboard')}
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
        <Card className={`mb-8 border-2 ${statusConfig.border} ${statusConfig.bg}`}>
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

        {/* Rejection Reason */}
        {verification?.verification_status === 'rejected' && verification?.rejection_reason && (
          <Card className="mb-6 border-destructive bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Rejection Reason</p>
                  <p className="text-sm text-muted-foreground mt-1">{verification.rejection_reason}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>This information is from your signup.</CardDescription>
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

        {/* Document Uploads - Only show if not approved */}
        {verification?.verification_status !== 'approved' && (
          <>
            {/* Government ID */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IdCard className="h-5 w-5" />
                  Government ID (Required)
                </CardTitle>
                <CardDescription>
                  Upload a clear photo of your National ID Card, Voter's Card, or Driver's License
                </CardDescription>
              </CardHeader>
              <CardContent>
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload Government ID</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, 'government_id')}
                    className="hidden"
                    multiple
                  />
                </label>
              </CardContent>
            </Card>

            {/* Passport Photo */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Passport Photograph (Required)
                </CardTitle>
                <CardDescription>
                  Upload a recent passport-sized photograph with clear face visibility
                </CardDescription>
              </CardHeader>
              <CardContent>
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload Passport Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'passport')}
                    className="hidden"
                    multiple
                  />
                </label>
              </CardContent>
            </Card>

            {/* Other Documents */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileArchive className="h-5 w-5" />
                  Office/Agency Documents (Optional)
                </CardTitle>
                <CardDescription>
                  Upload any additional documents like business registration, proof of address, etc.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload additional documents</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, 'other')}
                    className="hidden"
                    multiple
                  />
                </label>
              </CardContent>
            </Card>

            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileArchive className="h-5 w-5" />
                    Uploaded Documents ({uploadedFiles.length})
                  </CardTitle>
                  <CardDescription>
                    These files will be compressed into a single ZIP file before upload
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg border bg-muted overflow-hidden">
                          {file.preview ? (
                            <img 
                              src={file.preview} 
                              alt={file.file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2">
                              <FileArchive className="h-8 w-8 text-muted-foreground mb-2" />
                              <p className="text-xs text-muted-foreground text-center truncate w-full">
                                {file.file.name}
                              </p>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">{file.type.replace('_', ' ')}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              className="w-full" 
              size="lg"
              disabled={uploading || uploadedFiles.length === 0}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating ZIP & Uploading...
                </>
              ) : (
                <>
                  <FileArchive className="h-5 w-5 mr-2" />
                  Submit Documents for Verification
                </>
              )}
            </Button>

            {hasSubmitted && verification?.verification_status === 'pending' && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                You have already submitted documents. Uploading new documents will replace the previous submission.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
