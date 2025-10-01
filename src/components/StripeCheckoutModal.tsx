import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface StripeCheckoutModalProps {
  clientSecret: string;
  sessionId?: string;
  onClose: () => void;
}

const stripePromise = loadStripe("pk_live_51QUQJnAyNEkKfkLVcBfb7jqNpOvW3ksW8d7xvRzTK9ZTqYrJnCzXcVbNmOpAsQwErTyUiOpLkJhGfDsAzXcVbNm00kEY5L8ZT");

export const StripeCheckoutModal = ({ clientSecret, sessionId, onClose }: StripeCheckoutModalProps) => {
  const [loading, setLoading] = useState(true);

  const options = {
    clientSecret,
    onComplete: () => {
      // El pago se completó exitosamente
      setTimeout(() => {
        onClose();
        // Redireccionar con session_id para verificación
        const redirectUrl = sessionId 
          ? `/pago-exitoso?session_id=${sessionId}`
          : "/pago-exitoso";
        window.location.href = redirectUrl;
      }, 2000);
    },
  };

  useEffect(() => {
    // Simular tiempo de carga del componente de Stripe
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-full min-h-[400px]">
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Cargando método de pago...</p>
          </div>
        </div>
      ) : (
        <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      )}
    </div>
  );
};