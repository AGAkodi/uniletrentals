import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, FileText, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/layout/Navbar';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Blog } from '@/types/database';

export default function ManageBlogs() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const { data: blogs, mutate } = useSWR<Blog[]>('admin-blogs', async () => {
        const { data, error } = await supabase
            .from('blogs')
            .select('*, author:profiles!blogs_author_id_fkey(*)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Blog[];
    });

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('blogs').delete().eq('id', id);

        if (error) {
            toast({ title: 'Error', description: 'Failed to delete blog post.', variant: 'destructive' });
            return;
        }

        toast({ title: 'Success', description: 'Blog post deleted.' });
        mutate();
    };

    return (
        <div className="min-h-screen bg-secondary/30">
            <Navbar />

            <main className="pt-8 px-6 md:px-8 lg:px-12">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold font-display">Manage Blogs</h1>
                            <p className="text-muted-foreground">Create and manage content for students</p>
                        </div>
                        <Button onClick={() => navigate('/admin/create-blog')}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create New Post
                        </Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>All Posts ({blogs?.length || 0})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!blogs ? (
                                <div className="space-y-4">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="h-24 bg-secondary/50 rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : blogs.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                                    <p className="text-muted-foreground mb-4">Start by creating your first blog post.</p>
                                    <Button onClick={() => navigate('/admin/create-blog')}>Create Post</Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {blogs.map((blog) => (
                                        <div key={blog.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-lg bg-secondary/50 gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="h-16 w-24 rounded-md overflow-hidden bg-background shrink-0">
                                                    {blog.cover_image ? (
                                                        <img src={blog.cover_image} alt={blog.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-muted">
                                                            <FileText className="h-6 w-6 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold line-clamp-1">{blog.title}</h3>
                                                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${blog.published ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                                            {blog.published ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                            {blog.published ? 'Published' : 'Draft'}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {new Date(blog.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 w-full md:w-auto">
                                                <Button variant="outline" size="sm" className="flex-1 md:flex-none" asChild>
                                                    <Link to={`/admin/edit-blog/${blog.id}`}>
                                                        <Pencil className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </Link>
                                                </Button>
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link to={`/blog/${blog.slug}`} target="_blank">
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Blog Post?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the blog post "{blog.title}".
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(blog.id)} className="bg-destructive hover:bg-destructive/90">
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
