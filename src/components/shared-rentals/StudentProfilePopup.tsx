import { Profile } from '@/types/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, CheckCircle } from 'lucide-react';
import { getAvatarUrl, generateAvatarSeed } from '@/lib/avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface StudentProfilePopupProps {
  student: Profile;
  children: React.ReactNode;
}

export function StudentProfilePopup({ student, children }: StudentProfilePopupProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80" align="start">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage 
              src={getAvatarUrl(
                student.avatar_url,
                generateAvatarSeed(student.full_name, student.email, student.id)
              ) || ''} 
              alt={student.full_name} 
            />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {getInitials(student.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{student.full_name}</h4>
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span>{student.email}</span>
            </div>
            {student.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span>{student.phone}</span>
              </div>
            )}
            {student.student_id && (
              <p className="text-xs text-muted-foreground mt-2">
                Student ID: {student.student_id}
              </p>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
