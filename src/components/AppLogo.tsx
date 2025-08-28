import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AppLogoProps {
  className?: string;
  fallbackText?: string;
}

const AppLogo: React.FC<AppLogoProps> = ({ 
  className = "h-8 w-auto", 
  fallbackText = "The Nook Madrid" 
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        // URL directa del logo de The Nook Madrid
        const logoUrl = 'https://duedcqgrflmmmxmpdytu.supabase.co/storage/v1/object/sign/logo/thenook.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yNjVhZDEyNS05NzI2LTQ1MzEtYTcxMy01Y2Q4NjE0ZTUwOTIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvL3RoZW5vb2suanBnIiwiaWF0IjoxNzU2MjkxNDkyLCJleHAiOjE4NDI2OTE0OTJ9.vCJWD8edyqvBPIQCdWKF1LFWWdpsCvkF-pp_5qermS8';
        
        // Verificar que la imagen carga correctamente
        const response = await fetch(logoUrl, { method: 'HEAD' });
        if (response.ok) {
          setLogoUrl(logoUrl);
        }
      } catch (error) {
        console.log('Error cargando logo, usando fallback text');
      } finally {
        setLoading(false);
      }
    };

    fetchLogo();
  }, []);

  if (loading) {
    return (
      <div className={`${className} bg-muted animate-pulse rounded`}>
        <span className="sr-only">Cargando logo...</span>
      </div>
    );
  }

  if (logoUrl) {
    return (
      <img 
        src={logoUrl} 
        alt="The Nook Madrid" 
        className={className}
        style={{ objectFit: 'contain' }}
      />
    );
  }

  return (
    <span className="font-bold text-lg text-primary">
      {fallbackText}
    </span>
  );
};

export default AppLogo;