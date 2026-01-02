import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Home, Mail, Lock, Eye, EyeOff, User, Phone, Building2, MapPin, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

const agentSignupSchema = z.object({
  fullName: z.string().min(2, 'Full name is required').max(100),
  companyName: z.string().optional(),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Please enter a valid phone number').max(15),
  officeAddress: z.string().min(10, 'Please provide your office/address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  isStudentAgent: z.boolean(),
  department: z.string().optional(),
  matricNumber: z.string().optional(),
  studentId: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine((data) => {
  if (data.isStudentAgent) {
    return data.department && data.department.length >= 2;
  }
  return true;
}, {
  message: "Department is required for student agents",
  path: ['department'],
});

export default function AgentSignup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    officeAddress: '',
    password: '',
    confirmPassword: '',
    isStudentAgent: false,
    department: '',
    matricNumber: '',
    studentId: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = agentSignupSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    
    const metadata: Record<string, unknown> = {
      full_name: formData.fullName,
      phone: formData.phone,
      role: 'agent',
    };

    if (formData.isStudentAgent) {
      metadata.student_id = formData.studentId;
    }

    const { error } = await signUp(formData.email, formData.password, metadata);

    if (error) {
      setLoading(false);
      toast({
        title: 'Signup Failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from('agent_verifications').insert({
        user_id: user.id,
        company_name: formData.companyName || null,
        office_address: formData.officeAddress,
        verification_status: 'pending',
      });
    }

    setLoading(false);
    toast({ 
      title: 'Account created!', 
      description: 'Your agent account is pending verification. You can upload documents from your dashboard.' 
    });
    navigate('/agent');
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Home className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">UNILET</span>
            </Link>
            <h1 className="text-3xl font-bold mb-2 font-display">Become an Agent</h1>
            <p className="text-muted-foreground leading-relaxed">List your properties and reach thousands of students</p>
          </div>

          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 text-sm">
            <p className="font-medium text-warning font-display">Verification Required</p>
            <p className="text-muted-foreground mt-1 leading-relaxed">
              After signup, you'll need to upload verification documents. Your listings will be visible after admin approval.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
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
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="agent@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

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
                  <p className="font-medium">Are you a Student Agent?</p>
                  <p className="text-sm text-muted-foreground">Tick if you're a student listing properties</p>
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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10"
                />
              </div>
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Agent Account'}
            </Button>
          </form>

          <p className="text-center text-muted-foreground">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-primary-foreground text-center max-w-md">
            <Building2 className="h-16 w-16 mx-auto mb-6 opacity-80" />
            <h2 className="text-4xl font-bold mb-4 font-display">Partner With UNILET</h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              List your properties, get verified, and connect with students looking for quality accommodation.
            </p>
            <div className="mt-8 space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">✓</div>
                <span>Reach thousands of students</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">✓</div>
                <span>Get verified agent badge</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">✓</div>
                <span>Manage bookings easily</span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
