import { useState, useRef, useCallback } from 'react';
import { Camera, X, Check, ZoomIn, ZoomOut } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  fallbackText: string;
  onAvatarChange: (file: File) => void;
  previewUrl?: string | null;
}

const AVATAR_SIZE = 256; // Final avatar size in pixels

export function AvatarUpload({ 
  currentAvatarUrl, 
  fallbackText, 
  onAvatarChange,
  previewUrl 
}: AvatarUploadProps) {
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
        setShowCropDialog(true);
      };
      reader.readAsDataURL(file);
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  }, [position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const cropAndSave = async () => {
    if (!selectedImage || !imageRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const img = imageRef.current;
    const containerSize = 200; // The visible crop area size
    const scale = AVATAR_SIZE / containerSize;

    // Calculate the source coordinates
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    const displayedWidth = containerSize * zoom;
    const displayedHeight = (imgHeight / imgWidth) * displayedWidth;

    // Center offset
    const centerOffsetX = (containerSize - displayedWidth) / 2 + position.x;
    const centerOffsetY = (containerSize - displayedHeight) / 2 + position.y;

    // Source rectangle in natural image coordinates
    const sx = (-centerOffsetX / displayedWidth) * imgWidth;
    const sy = (-centerOffsetY / displayedHeight) * imgHeight;
    const sWidth = (containerSize / displayedWidth) * imgWidth;
    const sHeight = (containerSize / displayedHeight) * imgHeight;

    // Draw the cropped image
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

    // Convert to blob and create file
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'avatar.png', { type: 'image/png' });
        onAvatarChange(file);
        setShowCropDialog(false);
        setSelectedImage(null);
      }
    }, 'image/png', 0.9);
  };

  const cancelCrop = () => {
    setShowCropDialog(false);
    setSelectedImage(null);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <>
      <div className="relative">
        <Avatar className="h-24 w-24">
          <AvatarImage src={displayUrl || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
            {fallbackText}
          </AvatarFallback>
        </Avatar>
        <label className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
          <Camera className="h-4 w-4 text-primary-foreground" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>
      </div>

      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Your Photo</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4">
            {/* Crop Area */}
            <div 
              ref={containerRef}
              className="relative w-[200px] h-[200px] rounded-full overflow-hidden bg-muted cursor-move border-2 border-primary"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {selectedImage && (
                <img
                  ref={imageRef}
                  src={selectedImage}
                  alt="Crop preview"
                  className="absolute select-none pointer-events-none"
                  style={{
                    width: `${100 * zoom}%`,
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                  }}
                  draggable={false}
                />
              )}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Drag to reposition • Use slider to zoom
            </p>

            {/* Zoom Control */}
            <div className="flex items-center gap-3 w-full max-w-[200px]">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={1}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={cancelCrop}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={cropAndSave}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}