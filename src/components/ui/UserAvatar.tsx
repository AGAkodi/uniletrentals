import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarUrl, generateAvatarSeed } from '@/lib/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  userId?: string | null;
  fallback?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

export function UserAvatar({
  avatarUrl,
  name,
  email,
  userId,
  fallback,
  className,
  size = 'md',
}: UserAvatarProps) {
  const avatarSrc = getAvatarUrl(
    avatarUrl,
    generateAvatarSeed(name, email, userId)
  );

  const fallbackText = fallback || name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={avatarSrc || undefined} alt={name || 'User'} />
      <AvatarFallback className={cn('bg-primary text-primary-foreground font-semibold', textSizeClasses[size])}>
        {fallbackText}
      </AvatarFallback>
    </Avatar>
  );
}
