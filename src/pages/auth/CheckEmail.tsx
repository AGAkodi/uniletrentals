import { Link } from 'react-router-dom';
import { Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import logo from '@/assets/logo.svg';

export default function CheckEmail() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <div className="w-full max-w-md space-y-8 text-center">
                {/* Logo */}
                <Link to="/" className="inline-block">
                    <img src={logo} alt="UNILET" className="h-12 mx-auto" />
                </Link>

                <div className="space-y-4">
                    <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-in zoom-in duration-500">
                        <Mail className="h-10 w-10 text-primary" />
                    </div>

                    <h1 className="text-3xl font-bold font-display">Check your email</h1>

                    <div className="space-y-2 text-muted-foreground">
                        <p>We've sent a verification link to your email address.</p>
                        <p>Please check your inbox and click the link to verify your account.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-secondary/50 p-4 rounded-lg flex items-start gap-3 text-left">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        <div className="text-sm">
                            <p className="font-medium">Email Verification Required</p>
                            <p className="text-muted-foreground">Click the link in your email to verify your account and complete the signup process.</p>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Didn't receive the email? Check your spam folder or
                        </p>
                        <Button variant="outline" asChild className="w-full">
                            <Link to="/auth/login">Return to Login</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
