import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Upload, RotateCcw, Move, Scissors, X } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ImageUploadCropperProps {
  onImageSelect: (file: File, cropData?: { x: number; y: number; width: number; height: number }) => void;
  currentImage?: string;
  label: string;
}

export const ImageUploadCropper = ({ onImageSelect, currentImage, label }: ImageUploadCropperProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(currentImage || null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState([1]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
      setOriginalFile(file);
      setPosition({ x: 0, y: 0 });
      setScale([1]);
      setIsDialogOpen(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const maxX = Math.max(0, (rect.width * scale[0] - rect.width) / 2);
    const maxY = Math.max(0, (rect.height * scale[0] - rect.height) / 2);

    const newX = Math.min(maxX, Math.max(-maxX, e.clientX - dragStart.x));
    const newY = Math.min(maxY, Math.max(-maxY, e.clientY - dragStart.y));

    setPosition({ x: newX, y: newY });
  }, [isDragging, dragStart, scale]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetImage = () => {
    setPosition({ x: 0, y: 0 });
    setScale([1]);
  };

  const handleConfirm = () => {
    if (originalFile) {
      // Calculate crop data based on position and scale
      const cropData = {
        x: -position.x / scale[0],
        y: -position.y / scale[0],
        width: 300 / scale[0], // Base crop size
        height: 200 / scale[0]
      };
      onImageSelect(originalFile, cropData);
      setIsDialogOpen(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setOriginalFile(null);
    setPosition({ x: 0, y: 0 });
    setScale([1]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {selectedImage ? (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Imagen seleccionada</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={removeImage}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="relative">
            <img 
              src={selectedImage} 
              alt="Vista previa" 
              className="w-full h-32 object-cover rounded-md"
            />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="absolute top-2 right-2"
                >
                  <Scissors className="h-3 w-3 mr-1" />
                  Ajustar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Move className="h-4 w-4" />
                    Ajustar Imagen
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="relative overflow-hidden border rounded-md bg-muted" style={{ height: '200px' }}>
                    {selectedImage && (
                      <img
                        ref={imageRef}
                        src={selectedImage}
                        alt="Editar"
                        className="absolute cursor-move select-none"
                        style={{
                          transform: `translate(${position.x}px, ${position.y}px) scale(${scale[0]})`,
                          transformOrigin: 'center',
                          maxWidth: 'none',
                          height: '200px',
                          width: 'auto'
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        draggable={false}
                      />
                    )}
                    <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-primary/50" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Zoom</Label>
                    <Slider
                      value={scale}
                      onValueChange={setScale}
                      min={0.5}
                      max={3}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={resetImage}
                      className="flex-1"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Resetear
                    </Button>
                    <Button 
                      onClick={handleConfirm}
                      className="flex-1"
                    >
                      Confirmar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>
      ) : (
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
          <div 
            className="p-6 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">
              Haz clic para subir una imagen
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG hasta 5MB
            </p>
          </div>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};