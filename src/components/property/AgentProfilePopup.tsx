import { useState } from 'react';
import useSWR from 'swr';
import { Star, Home, CheckCircle, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { getAvatarUrl, generateAvatarSeed } from '@/lib/avatar';

interface AgentProfilePopupProps {
  agent: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    email?: string;
  };
  children: React.ReactNode;
}

export function AgentProfilePopup({ agent, children }: AgentProfilePopupProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch agent's listing count
  const { data: listingCount } = useSWR(
    open ? `agent-listings-${agent.id}` : null,
    async () => {
      const { count } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
        .eq('status', 'approved');
      return count || 0;
    }
  );

  // Fetch agent's verification info
  const { data: verification } = useSWR(
    open ? `agent-verification-${agent.id}` : null,
    async () => {
      const { data } = await supabase
        .from('agent_verifications')
        .select('agent_id, verification_status')
        .eq('user_id', agent.id)
        .maybeSingle();
      return data;
    }
  );

  // Fetch agent's reviews
  const { data: reviews, mutate: mutateReviews } = useSWR(
    open ? `agent-reviews-${agent.id}` : null,
    async () => {
      const { data } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          user_id,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    }
  );

  const averageRating = reviews?.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const handleSubmitReview = async () => {
    if (!user) {
      toast({ title: 'Please login', description: 'You need to be logged in to leave a review.', variant: 'destructive' });
      return;
    }

    if (rating === 0) {
      toast({ title: 'Select a rating', description: 'Please select a star rating.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('reviews')
      .insert({
        user_id: user.id,
        agent_id: agent.id,
        rating,
        comment: comment.trim() || null,
      });

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already reviewed', description: 'You have already reviewed this agent.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to submit review. Please try again.', variant: 'destructive' });
      }
      return;
    }

    toast({ title: 'Review submitted!', description: 'Thank you for your feedback.' });
    setRating(0);
    setComment('');
    mutateReviews();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-[280px] p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-sm">Agent Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Agent Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={getAvatarUrl(
                  agent.avatar_url,
                  generateAvatarSeed(agent.full_name, agent.email, agent.id)
                ) || ''} 
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {agent.full_name?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-sm">{agent.full_name}</h3>
              {verification?.agent_id && (
                <p className="text-xs text-muted-foreground">ID: {verification.agent_id}</p>
              )}
              {verification?.verification_status === 'approved' && (
                <div className="flex items-center gap-1 text-xs text-accent">
                  <CheckCircle className="h-3 w-3" />
                  <span>Verified</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-secondary rounded-md p-2 text-center">
              <div className="flex items-center justify-center gap-1">
                <Home className="h-3 w-3 text-primary" />
                <span className="text-sm font-bold">{listingCount ?? '-'}</span>
              </div>
              <p className="text-xs text-muted-foreground">Listings</p>
            </div>
            <div className="bg-secondary rounded-md p-2 text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-3 w-3 fill-warning text-warning" />
                <span className="text-sm font-bold">{averageRating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{reviews?.length || 0} Reviews</p>
            </div>
          </div>

          {/* Reviews */}
          {reviews && reviews.length > 0 && (
            <div className="max-h-20 overflow-y-auto space-y-1">
              {reviews.slice(0, 2).map((review) => (
                <div key={review.id} className="bg-secondary/50 rounded p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{(review.profiles as any)?.full_name || 'User'}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-2.5 w-2.5 ${star <= review.rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-muted-foreground truncate mt-0.5">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Leave Review */}
          <div className="border-t pt-3">
            <p className="text-xs font-medium mb-2">Rate this agent</p>
            <div className="flex items-center gap-0.5 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-5 w-5 transition-colors ${star <= (hoverRating || rating)
                      ? 'fill-warning text-warning'
                      : 'text-muted-foreground hover:text-warning/50'
                      }`}
                  />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Comment (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="text-xs min-h-0"
            />
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmitting || rating === 0}
              size="sm"
              className="w-full mt-2"
            >
              <Send className="h-3 w-3 mr-1" />
              Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
