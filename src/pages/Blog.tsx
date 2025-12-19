import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { Blog } from '@/types/database';
import { Calendar, User } from 'lucide-react';

export default function BlogPage() {
  const { data: blogs, isLoading } = useSWR<Blog[]>('blogs', async () => {
    const { data, error } = await supabase
      .from('blogs')
      .select('*, author:profiles!blogs_author_id_fkey(*)')
      .eq('published', true)
      .order('published_at', { ascending: false });
    
    if (error) throw error;
    return data as Blog[];
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">UNILET Blog</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tips, guides, and insights for finding your perfect student accommodation.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-video rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : blogs && blogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <Link key={blog.id} to={`/blog/${blog.slug}`}>
                <Card className="overflow-hidden group hover:shadow-card-hover transition-all duration-300">
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={blog.cover_image || 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800'}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {blog.title}
                    </h2>
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {blog.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {blog.published_at ? new Date(blog.published_at).toLocaleDateString() : 'Draft'}
                      </div>
                      {blog.author && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {blog.author.full_name}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold mb-2">No blog posts yet</h3>
            <p className="text-muted-foreground">Check back soon for helpful guides and tips!</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
