import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { Blog } from '@/types/database';
import { ChevronLeft, Calendar, User } from 'lucide-react';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  const { data: blog, isLoading } = useSWR<Blog | null>(
    slug ? `blog-${slug}` : null,
    async () => {
      const { data, error } = await supabase
        .from('blogs')
        .select('*, author:profiles!blogs_author_id_fkey(*)')
        .eq('slug', slug!)
        .eq('published', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as Blog | null;
    }
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="aspect-video rounded-xl mb-8" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!blog) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-6">The blog post you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/blog">Back to Blog</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="container mx-auto px-4 py-12 max-w-3xl">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/blog">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Blog
          </Link>
        </Button>

        {blog.cover_image && (
          <div className="aspect-video rounded-xl overflow-hidden mb-8">
            <img
              src={blog.cover_image}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <h1 className="text-4xl font-bold mb-4">{blog.title}</h1>

        <div className="flex items-center gap-6 mb-8 pb-8 border-b">
          {blog.author && (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={blog.author.avatar_url || ''} />
                <AvatarFallback>{blog.author.full_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{blog.author.full_name}</p>
                <p className="text-sm text-muted-foreground">Author</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {blog.published_at ? new Date(blog.published_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }) : 'Draft'}
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          <div dangerouslySetInnerHTML={{ __html: blog.content.replace(/\n/g, '<br />') }} />
        </div>
      </article>
    </Layout>
  );
}
