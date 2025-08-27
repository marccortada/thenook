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
        const { data } = await supabase.storage
          .from('logo')
          .getPublicUrl('thenook.jpg');
        
        if (data?.publicUrl) {
          // Check if the file actually exists
          const response = await fetch(data.publicUrl, { method: 'HEAD' });
          if (response.ok) {
            setLogoUrl(data.publicUrl);
          }
        }
      } catch (error) {
        console.log('No logo found, using fallback text');
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