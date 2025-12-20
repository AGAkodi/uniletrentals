import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User as UserIcon, Home, Heart, Users, GitCompare, FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { DashboardSidebar, SidebarItem } from '@/components/dashboard/DashboardSidebar';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { Blog } from '@/types/database';

const studentNavItems: SidebarItem[] = [
  { icon: User, label: 'Profile', href: '/student/profile' },
  { icon: Home, label: 'Browse Listings', href: '/dashboard' },
  { icon: Heart, label: 'Saved Properties', href: '/student/saved' },
  { icon: Users, label: 'Shared Rental Space', href: '/student/shared' },
  { icon: GitCompare, label: 'Compare Listings', href: '/student/compare' },
  { icon: FileText, label: 'Blog', href: '/student/blog' },
];

export default function StudentBlog() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: blogs, isLoading } = useSWR<Blog[]>('student-blogs', async () => {
    const { data, error } = await supabase
      .from('blogs')
      .select('*, author:profiles!blogs_author_id_fkey(*)')
      .eq('published', true)
      .order('published_at', { ascending: false });
    
    if (error) throw error;
    return data as Blog[];
  });

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <DashboardSidebar 
        items={studentNavItems}
        userInfo={{
          name: profile?.full_name || 'Student',
          subtitle: 'Student Account',
          avatarUrl: profile?.avatar_url || undefined,
        }}
      />

      <main className="pt-8 px-6 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">UNILET Blog</h1>
              <p className="text-muted-foreground">Tips, guides, and insights for finding your perfect accommodation</p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((blog) => (
                <Link key={blog.id} to={`/blog/${blog.slug}`}>
                  <Card className="overflow-hidden group hover:shadow-card-hover transition-all duration-300 h-full">
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={blog.cover_image || 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800'}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <CardContent className="p-5">
                      <h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {blog.title}
                      </h2>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {blog.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {blog.published_at ? new Date(blog.published_at).toLocaleDateString() : 'Draft'}
                        </div>
                        {blog.author && (
                          <div className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
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
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No blog posts yet</h3>
                <p className="text-muted-foreground">Check back soon for helpful guides and tips!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
