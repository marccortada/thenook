import { useEffect, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface StripeCheckoutModalProps {
  clientSecret: string;
  sessionId?: string;
  onClose: () => void;
}

const publishableKey =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_STRIPE_PUBLIC_KEY ||
  import.meta.env.VITE_STRIPE_PK;

const stripePromise: Promise<Stripe | null> | null = publishableKey
  ? loadStripe(publishableKey)
  : null;

export const StripeCheckoutModal = ({ clientSecret, sessionId, onClose }: StripeCheckoutModalProps) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publishableKey) {
      console.error("Falta la clave pública de Stripe. Define VITE_STRIPE_PUBLISHABLE_KEY en el entorno.");
    }
  }, []);

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
    <div className="w-full min-h-[500px]">
      {!stripePromise ? (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-4">
          <Loader2 className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">
            No se pudo inicializar Stripe. Revisa la configuración de la clave pública.
          </p>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center min-h-[500px]">
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
