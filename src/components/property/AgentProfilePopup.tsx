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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agent Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Agent Info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={agent.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {agent.full_name?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{agent.full_name}</h3>
              {verification?.agent_id && (
                <p className="text-sm text-muted-foreground">ID: {verification.agent_id}</p>
              )}
              {verification?.verification_status === 'approved' && (
                <div className="flex items-center gap-1 text-sm text-accent mt-1">
                  <CheckCircle className="h-4 w-4" />
                  <span>Verified Agent</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Home className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{listingCount ?? '-'}</span>
              </div>
              <p className="text-sm text-muted-foreground">Listed Properties</p>
            </div>
            <div className="bg-secondary rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Star className="h-5 w-5 fill-warning text-warning" />
                <span className="text-2xl font-bold">{averageRating.toFixed(1)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{reviews?.length || 0} Reviews</p>
            </div>
          </div>

          <Separator />

          {/* Reviews */}
          <div>
            <h4 className="font-semibold mb-3">Recent Reviews</h4>
            {reviews && reviews.length > 0 ? (
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-secondary/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {(review.profiles as any)?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{(review.profiles as any)?.full_name || 'User'}</span>
                      <div className="flex items-center gap-0.5 ml-auto">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`h-3 w-3 ${star <= review.rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet</p>
            )}
          </div>

          <Separator />

          {/* Leave Review */}
          <div>
            <h4 className="font-semibold mb-3">Leave a Review</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-1">
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
                      className={`h-7 w-7 transition-colors ${
                        star <= (hoverRating || rating) 
                          ? 'fill-warning text-warning' 
                          : 'text-muted-foreground hover:text-warning/50'
                      }`} 
                    />
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Share your experience with this agent (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <Button 
                onClick={handleSubmitReview} 
                disabled={isSubmitting || rating === 0}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit Review
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
