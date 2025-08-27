import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Check, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const LogoUpload = () => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    checkCurrentLogo();
  }, []);

  const checkCurrentLogo = async () => {
    try {
      const { data } = await supabase.storage
        .from('logo')
        .getPublicUrl('thenook.jpg');
      
      if (data?.publicUrl) {
        // Check if the file actually exists by trying to fetch it
        const response = await fetch(data.publicUrl, { method: 'HEAD' });
        if (response.ok) {
          setCurrentLogo(data.publicUrl);
        }
      }
    } catch (error) {
      console.log('No logo found');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo de imagen válido.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "El archivo es demasiado grande. Máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const uploadLogo = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // Upload the file with a fixed name so it can be easily referenced
      const { data, error } = await supabase.storage
        .from('logo')
        .upload('thenook.jpg', file, {
          cacheControl: '3600',
          upsert: true, // This will overwrite if exists
        });

      if (error) throw error;

      toast({
        title: "✅ Logo subido",
        description: "El logo se ha subido correctamente y se usará en las facturas.",
      });

      // Refresh the current logo
      await checkCurrentLogo();
      setFile(null);
      
      // Reset the input
      const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el logo. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    try {
      const { error } = await supabase.storage
        .from('logo')
        .remove(['thenook.jpg']);

      if (error) throw error;

      setCurrentLogo(null);
      toast({
        title: "Logo eliminado",
        description: "El logo ha sido eliminado correctamente.",
      });
    } catch (error) {
      console.error('Error removing logo:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el logo.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ImageIcon className="h-5 w-5" />
          <span>Logo para Facturas</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentLogo ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Logo actual que se usa en las facturas:
            </div>
            <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/50">
              <img 
                src={currentLogo} 
                alt="Logo actual" 
                className="max-h-20 max-w-40 object-contain"
                onError={() => setCurrentLogo(null)}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={removeLogo}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Eliminar Logo
            </Button>
          </div>
        ) : (
          <div className="text-center p-8 border-2 border-dashed border-muted rounded-lg">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay logo configurado</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="logo-upload">Subir nuevo logo</Label>
            <Input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="mt-1"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Formatos soportados: PNG, JPG, SVG. Máximo 5MB.
            </div>
          </div>

          {file && (
            <div className="space-y-3">
              <div className="text-sm font-medium">
                Archivo seleccionado: {file.name}
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={uploadLogo}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Confirmar y Subir
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFile(null);
                    const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground p-3 bg-blue-50 rounded-lg">
          <strong>Nota:</strong> El logo se mostrará automáticamente en todas las facturas que se envíen por email a los clientes cuando hagan una reserva.
        </div>
      </CardContent>
    </Card>
  );
};

export default LogoUpload;