import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, Eye, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface GiftCardData {
  code: string;
  amount: number;
  purchaseDate: string;
  recipientName?: string;
  purchaserName?: string;
  message?: string;
}

const GiftCardImageGenerator = () => {
  const [giftCardData, setGiftCardData] = useState<GiftCardData>({
    code: '',
    amount: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    recipientName: '',
    purchaserName: '',
    message: ''
  });
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateGiftCard = async () => {
    if (!giftCardData.code || !giftCardData.amount) {
      toast.error('Código y cantidad son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-gift-card-image', {
        body: giftCardData
      });

      if (error) throw error;

      if (data.success) {
        setGeneratedImage(data.imageData);
        toast.success('Tarjeta de regalo generada exitosamente');
      } else {
        throw new Error(data.error || 'Error generando la tarjeta');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error generando la tarjeta de regalo');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;

    // Convertir SVG a PNG para descarga
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 600;
      canvas.height = 400;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `gift-card-${giftCardData.code}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
    };

    img.src = generatedImage;
  };

  const generateRandomCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setGiftCardData(prev => ({ ...prev, code }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Generador de Tarjetas de Regalo Personalizadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código único *</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={giftCardData.code}
                  onChange={(e) => setGiftCardData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="Ej: GIFT2024"
                  className="font-mono"
                />
                <Button variant="outline" onClick={generateRandomCode}>
                  Generar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Cantidad (€) *</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                value={giftCardData.amount || ''}
                onChange={(e) => setGiftCardData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="Ej: 50.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Fecha de compra *</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={giftCardData.purchaseDate}
                onChange={(e) => setGiftCardData(prev => ({ ...prev, purchaseDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientName">Para (opcional)</Label>
              <Input
                id="recipientName"
                value={giftCardData.recipientName || ''}
                onChange={(e) => setGiftCardData(prev => ({ ...prev, recipientName: e.target.value }))}
                placeholder="Nombre del destinatario"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchaserName">De (opcional)</Label>
              <Input
                id="purchaserName"
                value={giftCardData.purchaserName || ''}
                onChange={(e) => setGiftCardData(prev => ({ ...prev, purchaserName: e.target.value }))}
                placeholder="Nombre del comprador"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="message">Mensaje personalizado (opcional)</Label>
              <Textarea
                id="message"
                value={giftCardData.message || ''}
                onChange={(e) => setGiftCardData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Mensaje especial para incluir en la tarjeta"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={generateGiftCard}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {loading ? 'Generando...' : 'Vista previa'}
            </Button>

            {generatedImage && (
              <Button 
                onClick={downloadImage}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar PNG
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {generatedImage && (
        <Card>
          <CardHeader>
            <CardTitle>Vista previa de la tarjeta de regalo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <img 
                src={generatedImage} 
                alt="Gift Card Preview" 
                className="max-w-full h-auto border rounded-lg shadow-lg"
                style={{ maxWidth: '600px' }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GiftCardImageGenerator;