import React, { useState, useRef, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  quality?: number;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width = 400,
  height = 300,
  quality = 80,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer para lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Empezar a cargar 50px antes de que sea visible
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Optimizar URL de Supabase con transformaciones
  const getOptimizedUrl = (originalSrc: string) => {
    // Si es una imagen de Supabase Storage
    if (originalSrc.includes('supabase.co') && originalSrc.includes('/storage/')) {
      const baseUrl = originalSrc.split('?')[0]; // Remover query params existentes
      return `${baseUrl}?width=${width}&height=${height}&resize=cover&quality=${quality}&format=webp`;
    }
    
    // Si es una imagen local o de otro CDN, usar como está
    return originalSrc;
  };

  const optimizedSrc = getOptimizedUrl(src);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {!isInView ? (
        // Skeleton mientras esperamos que sea visible
        <Skeleton className="w-full h-full" />
      ) : (
        <>
          {!isLoaded && !hasError && (
            // Skeleton mientras carga la imagen
            <Skeleton className="absolute inset-0 w-full h-full" />
          )}
          
          <img
            src={optimizedSrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setHasError(true);
              setIsLoaded(true);
            }}
            // Fallback para navegadores que no soportan WebP
            onLoadStart={() => {
              // Detectar si WebP no es soportado y usar JPEG
              if (!window.HTMLCanvasElement) {
                const img = document.createElement('img');
                img.src = optimizedSrc.replace('format=webp', 'format=jpeg');
              }
            }}
          />
          
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">Error al cargar imagen</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OptimizedImage;