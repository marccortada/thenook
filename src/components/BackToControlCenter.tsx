import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

interface BackToControlCenterProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const BackToControlCenter = ({ 
  className = "fixed top-4 left-4 z-50",
  variant = "outline",
  size = "default"
}: BackToControlCenterProps) => {
  const goBackToControlCenter = () => {
    // Si estamos en la misma pestaña, navegar directamente
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('lovable')) {
      window.location.href = '/';
    } else {
      // Si estamos en otra ventana/pestaña, intentar cerrar o navegar
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    }
  };

  return (
    <Button 
      onClick={goBackToControlCenter}
      variant={variant}
      size={size}
      className={className}
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      Volver al Centro de Control
    </Button>
  );
};

export default BackToControlCenter;