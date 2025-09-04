import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface StripeCheckoutModalProps {
  clientSecret: string;
  onClose: () => void;
}

// Get Stripe publishable key from environment
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_51QUQJnAyNEkKfkLVZCjXBFLcYhbcJZKlQVfK8PTqzgxO3F1pv6rV6mNMdkgHfpOmYZGY7jANXs4QWWNKhJhNPcgr00wQ7BSEuK";
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

export const StripeCheckoutModal = ({ clientSecret, onClose }: StripeCheckoutModalProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("🏗️ StripeCheckoutModal iniciado con clientSecret:", clientSecret ? "✓" : "✗");

  const options = {
    clientSecret,
    onComplete: () => {
      console.log("✅ Pago completado exitosamente");
      setTimeout(() => {
        onClose();
        window.location.href = "/pago-exitoso";
      }, 2000);
    },
  };

  useEffect(() => {
    console.log("🔄 Iniciando carga de Stripe...");
    
    // Verificar si tenemos clientSecret
    if (!clientSecret) {
      console.error("❌ No hay clientSecret disponible");
      setError("Error: No se pudo inicializar el pago");
      setLoading(false);
      return;
    }

    // Verificar si Stripe está disponible
    const timer = setTimeout(() => {
      console.log("✅ Stripe cargado exitosamente");
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [clientSecret]);

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[400px] max-h-[80vh] overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Cargando método de pago...</p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full">
          <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      )}
    </div>
  );
};