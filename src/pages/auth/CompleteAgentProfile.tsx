import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Home, Phone, Building2, MapPin, GraduationCap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

const agentProfileSchema = z.object({
  phone: z.string().min(10, 'Please enter a valid phone number').max(15),
  companyName: z.string().optional(),
  officeAddress: z.string().min(10, 'Please provide your office/address'),
  isStudentAgent: z.boolean(),
  department: z.string().optional(),
  matricNumber: z.string().optional(),
  studentId: z.string().optional(),
}).refine((data) => {
  if (data.isStudentAgent) {
    return data.department && data.department.length >= 2;
  }
  return true;
}, {
  message: "Department is required for student agents",
  path: ['department'],
});

export default function CompleteAgentProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, refreshProfile } = useAuth();
  
  const [formData, setFormData] = useState({
    phone: profile?.phone || '',
    companyName: '',
    officeAddress: '',
    isStudentAgent: false,
    department: '',
    matricNumber: '',
    studentId: profile?.student_id || '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = agentProfileSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    // Update profile with phone
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        phone: formData.phone,
        student_id: formData.isStudentAgent ? formData.studentId : null,
      })
      .eq('id', profile!.id);

    if (profileError) {
      setLoading(false);
      toast({
        title: 'Update Failed',
        description: profileError.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    // Create agent verification record
    const { error: verificationError } = await supabase
      .from('agent_verifications')
      .insert({
        user_id: profile!.id,
        company_name: formData.companyName || null,
        office_address: formData.officeAddress,
        verification_status: 'pending',
      });

    if (verificationError) {
      setLoading(false);
      toast({
        title: 'Update Failed',
        description: verificationError.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    await refreshProfile();
    setLoading(false);
    
    toast({
      title: 'Profile Complete!',
      description: 'Your agent account is pending verification. You can upload documents from your dashboard.',
    });
    
    navigate('/agent');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-primary flex items-center justify-center mb-4">
            <Home className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-display">Complete Agent Profile</CardTitle>
          <CardDescription>
            Please provide additional information to complete your agent account setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4 text-sm">
            <p className="font-medium text-warning">Verification Required</p>
            <p className="text-muted-foreground mt-1">
              After completing your profile, you'll need to upload verification documents.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (WhatsApp)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="phone"
                  name="phone"
                  placeholder="+234 800 000 0000"
                  value={formData.phone}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name (Optional)</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder="ABC Properties Ltd"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="officeAddress">Office Address / Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Textarea
                  id="officeAddress"
                  name="officeAddress"
                  placeholder="Enter your full office address"
                  value={formData.officeAddress}
                  onChange={handleChange}
                  className="pl-10 min-h-[80px]"
                />
              </div>
              {errors.officeAddress && <p className="text-sm text-destructive">{errors.officeAddress}</p>}
            </div>

            {/* Student Agent Toggle */}
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Are you a Student Agent?</p>
                  <p className="text-xs text-muted-foreground">Tick if you're a student listing properties</p>
                </div>
              </div>
              <Switch
                checked={formData.isStudentAgent}
                onCheckedChange={(checked) => setFormData({ ...formData, isStudentAgent: checked })}
              />
            </div>

            {/* Student Agent Fields */}
            {formData.isStudentAgent && (
              <div className="space-y-4 p-4 border border-primary/20 rounded-lg bg-primary/5">
                <p className="text-sm font-medium text-primary">Student Information</p>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    name="department"
                    placeholder="e.g., Computer Science"
                    value={formData.department}
                    onChange={handleChange}
                  />
                  {errors.department && <p className="text-sm text-destructive">{errors.department}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="matricNumber">Matric Number</Label>
                  <Input
                    id="matricNumber"
                    name="matricNumber"
                    placeholder="e.g., CSC/2021/001"
                    value={formData.matricNumber}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input
                    id="studentId"
                    name="studentId"
                    placeholder="Your student ID number"
                    value={formData.studentId}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Complete Profile'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
