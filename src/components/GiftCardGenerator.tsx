import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

interface GiftCardGeneratorProps {
  onGenerate?: (code: string, date: string) => void;
}

export const GiftCardGenerator: React.FC<GiftCardGeneratorProps> = ({ onGenerate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');

  // Generate unique alphanumeric code
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'TG';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Format current date
  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    const code = generateCode();
    const date = formatDate(new Date());
    setGiftCardCode(code);
    setPurchaseDate(date);
    onGenerate?.(code, date);
  }, [onGenerate]);

  const generateGiftCard = async () => {
    setIsLoading(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // Create image element
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = 'https://duedcqgrflmmmxmpdytu.supabase.co/storage/v1/object/public/gift-cards/www.thenookmadrid.com.png';
      });

      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw background image
      ctx.drawImage(img, 0, 0);

      // Configure text style
      ctx.fillStyle = '#4A4A4A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Calculate positions based on image dimensions
      const imgWidth = img.width;
      const imgHeight = img.height;

      // Upper square position (approximately where the upper rectangle is)
      const upperSquareX = imgWidth * 0.6; // Adjust based on actual position
      const upperSquareY = imgHeight * 0.32; // Adjust based on actual position
      
      // Lower square position (approximately where the lower rectangle is)
      const lowerSquareX = imgWidth * 0.6; // Adjust based on actual position  
      const lowerSquareY = imgHeight * 0.41; // Adjust based on actual position

      // Font size relative to image size
      const fontSize = Math.min(imgWidth, imgHeight) * 0.025;
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;

      // Draw code in upper square
      ctx.fillText(giftCardCode, upperSquareX, upperSquareY);

      // Draw date in lower square
      ctx.fillText(purchaseDate, lowerSquareX, lowerSquareY);

      toast.success('Tarjeta regalo generada correctamente');
    } catch (error) {
      console.error('Error generating gift card:', error);
      toast.error('Error al generar la tarjeta regalo');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadGiftCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `tarjeta-regalo-${giftCardCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    toast.success('Tarjeta regalo descargada');
  };

  useEffect(() => {
    generateGiftCard();
  }, [giftCardCode, purchaseDate]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Generador de Tarjeta Regalo</h3>
            <p className="text-sm text-muted-foreground">
              Código: {giftCardCode} | Fecha: {purchaseDate}
            </p>
          </div>
          
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto border border-border rounded-lg shadow-lg"
              style={{ maxHeight: '500px' }}
            />
          </div>

          <div className="flex justify-center gap-2">
            <Button
              onClick={generateGiftCard}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? 'Generando...' : 'Regenerar'}
            </Button>
            <Button
              onClick={downloadGiftCard}
              disabled={isLoading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Descargar PNG
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};