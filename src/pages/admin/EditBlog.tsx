import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    const [isUploading, setIsUploading] = useState(false);
    const [isFetching, setIsFetching] = useState(isEditing);

    const [formData, setFormData] = useState({
        title: '',
        summary: '',
        description: '',
        cover_image: '',
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
                summary: data.excerpt || '',
                description: data.content,
                cover_image: data.cover_image || '',
            });
            setIsFetching(false);
        };

        if (isEditing) {
            fetchBlog();
        }
    }, [id, isEditing, navigate, toast]);

    // Auto-generate slug from title
    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast({ title: 'Invalid file', description: 'Please select an image file.', variant: 'destructive' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast({ title: 'File too large', description: 'Image must be less than 5MB.', variant: 'destructive' });
            return;
        }

        setIsUploading(true);

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('blog-images')
                .upload(fileName, file);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                toast({ 
                    title: 'Upload Failed', 
                    description: 'Could not upload image. Please run the blog-images bucket SQL migration.', 
                    variant: 'destructive' 
                });
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('blog-images')
                .getPublicUrl(fileName);

            setFormData(prev => ({ ...prev, cover_image: publicUrl }));
            toast({ title: 'Image uploaded successfully!' });

        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Image upload failed.', variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!formData.title.trim()) {
            toast({ title: 'Title required', description: 'Please enter a title for your blog post.', variant: 'destructive' });
            return;
        }

        if (!formData.description.trim()) {
            toast({ title: 'Description required', description: 'Please enter the blog content.', variant: 'destructive' });
            return;
        }

        setIsLoading(true);

        const slug = generateSlug(formData.title);
        
        const payload = {
            title: formData.title,
            slug: slug,
            excerpt: formData.summary,
            content: formData.description,
            cover_image: formData.cover_image,
            author_id: user.id,
            published: true,
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
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
            toast({ title: 'Error', description: 'Failed to publish blog post.', variant: 'destructive' });
            return;
        }

        toast({ title: 'Success', description: 'Blog post published!' });
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
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/manage-blogs')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-3xl font-bold font-display">{isEditing ? 'Edit Blog Post' : 'Create New Post'}</h1>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Card>
                            <CardContent className="p-6 space-y-6">
                                {/* Title */}
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Enter blog title"
                                        required
                                    />
                                </div>

                                {/* Summary */}
                                <div className="space-y-2">
                                    <Label htmlFor="summary">Summary</Label>
                                    <Textarea
                                        id="summary"
                                        value={formData.summary}
                                        onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                                        placeholder="A brief summary of your blog post..."
                                        rows={3}
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Write your full blog post content here..."
                                        className="min-h-[300px]"
                                        required
                                    />
                                </div>

                                {/* Cover Image */}
                                <div className="space-y-2">
                                    <Label>Cover Image</Label>
                                    <div className="aspect-video bg-secondary rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center relative group">
                                        {formData.cover_image ? (
                                            <>
                                                <img src={formData.cover_image} alt="Cover" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Button 
                                                        variant="secondary" 
                                                        size="sm" 
                                                        type="button" 
                                                        onClick={() => document.getElementById('image-upload')?.click()}
                                                        disabled={isUploading}
                                                    >
                                                        {isUploading ? 'Uploading...' : 'Change Image'}
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center p-4">
                                                {isUploading ? (
                                                    <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin mb-2" />
                                                ) : (
                                                    <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                                )}
                                                <p className="text-sm text-muted-foreground">
                                                    {isUploading ? 'Uploading...' : 'Upload cover image'}
                                                </p>
                                                {!isUploading && (
                                                    <Button 
                                                        variant="link" 
                                                        size="sm" 
                                                        type="button" 
                                                        onClick={() => document.getElementById('image-upload')?.click()}
                                                    >
                                                        Select File
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                        <input
                                            id="image-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageUpload}
                                            disabled={isUploading}
                                        />
                                    </div>
                                </div>

                                {/* Publish Button */}
                                <Button type="submit" className="w-full" size="lg" disabled={isLoading || isUploading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                            Publishing...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-5 w-5 mr-2" />
                                            Publish Blog Post
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </form>
                </div>
            </main>
        </div>
    );
}
