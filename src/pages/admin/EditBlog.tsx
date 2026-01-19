import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Navbar } from '@/components/layout/Navbar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

export default function EditBlog() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();
    const isEditing = !!id;

    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(isEditing);

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        cover_image: '',
        published: false
    });

    // Fetch existing blog if editing
    useEffect(() => {
        const fetchBlog = async () => {
            if (!id) return;

            const { data, error } = await supabase
                .from('blogs')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                toast({ title: 'Error', description: 'Failed to load blog post.', variant: 'destructive' });
                navigate('/admin/manage-blogs');
                return;
            }

            setFormData({
                title: data.title,
                slug: data.slug,
                excerpt: data.excerpt || '',
                content: data.content,
                cover_image: data.cover_image || '',
                published: data.published
            });
            setIsFetching(false);
        };

        if (isEditing) {
            fetchBlog();
        }
    }, [id, isEditing, navigate, toast]);

    // Auto-generate slug from title
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const title = e.target.value;
        if (!isEditing) {
            const slug = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
            setFormData(prev => ({ ...prev, title, slug }));
        } else {
            setFormData(prev => ({ ...prev, title }));
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // TODO: Implement actual image upload to storage bucket
        // For now, we'll assume a placeholder or implement storage logic if bucket exists
        // Ideally: upload to 'blog-images' -> get public URL

        // Quick Hack for Demo/MVP if storage isn't fully set up with UI:
        // create object URL for preview (not persistent across devices but proves UI works)
        // OR upload to existing bucket if we know it works.

        // Let's try to upload to 'property-images' if 'blog-images' fails or just use property-images as a generic one?
        // Safer to just try uploading to 'blog-images' and handle error.

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('blog-images')
                .upload(filePath, file);

            if (uploadError) {
                // Fallback or error
                console.error(uploadError);
                toast({ title: 'Upload Failed', description: 'Could not upload image. Ensure bucket exists.', variant: 'destructive' });
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('blog-images')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, cover_image: publicUrl }));

        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Image upload failed.', variant: 'destructive' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsLoading(true);

        const payload = {
            ...formData,
            author_id: user.id,
            updated_at: new Date().toISOString(),
            ...(formData.published && !isEditing ? { published_at: new Date().toISOString() } : {})
        };

        let error;
        if (isEditing) {
            const { error: updateError } = await supabase
                .from('blogs')
                .update(payload)
                .eq('id', id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('blogs')
                .insert(payload);
            error = insertError;
        }

        setIsLoading(false);

        if (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to save blog post.', variant: 'destructive' });
            return;
        }

        toast({ title: 'Success', description: 'Blog post saved.' });
        navigate('/admin/manage-blogs');
    };

    if (isFetching) {
        return (
            <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary/30">
            <Navbar />

            <main className="pt-8 px-6 md:px-8 lg:px-12 pb-12">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/manage-blogs')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-3xl font-bold font-display">{isEditing ? 'Edit Blog Post' : 'Create New Post'}</h1>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Main Content */}
                            <div className="md:col-span-2 space-y-6">
                                <Card>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="space-y-2">
                                            <Label>Title</Label>
                                            <Input
                                                value={formData.title}
                                                onChange={handleTitleChange}
                                                placeholder="Enter post title"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Slug</Label>
                                            <Input
                                                value={formData.slug}
                                                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                                placeholder="post-url-slug"
                                                required
                                            />
                                            <p className="text-xs text-muted-foreground">URL: /blog/{formData.slug}</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Excerpt</Label>
                                            <Textarea
                                                value={formData.excerpt}
                                                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                                                placeholder="Short summary..."
                                                rows={3}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Content</Label>
                                            <Textarea
                                                value={formData.content}
                                                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                                placeholder="Write your post content here (Markdown supported)..."
                                                className="min-h-[400px] font-mono"
                                                required
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                <Card>
                                    <CardContent className="p-6 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <Label>Published</Label>
                                            <Switch
                                                checked={formData.published}
                                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, published: checked }))}
                                            />
                                        </div>

                                        <Button type="submit" className="w-full" disabled={isLoading}>
                                            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                            <Save className="h-4 w-4 mr-2" />
                                            Save Post
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-6 space-y-4">
                                        <Label>Cover Image</Label>

                                        <div className="aspect-video bg-secondary rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center relative group">
                                            {formData.cover_image ? (
                                                <>
                                                    <img src={formData.cover_image} alt="Cover" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Button variant="secondary" size="sm" type="button" onClick={() => document.getElementById('image-upload')?.click()}>
                                                            Change Image
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center p-4">
                                                    <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                                    <p className="text-sm text-muted-foreground">Upload cover image</p>
                                                    <Button variant="link" size="sm" type="button" onClick={() => document.getElementById('image-upload')?.click()}>
                                                        Select File
                                                    </Button>
                                                </div>
                                            )}
                                            <input
                                                id="image-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleImageUpload}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
