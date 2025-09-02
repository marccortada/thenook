import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface StripeCheckoutModalProps {
  clientSecret: string;
  onClose: () => void;
}

const stripePromise = loadStripe("pk_test_51QUQJnAyNEkKfkLVZCjXBFLcYhbcJZKlQVfK8PTqzgxO3F1pv6rV6mNMdkgHfpOmYZGY7jANXs4QWWNKhJhNPcgr00wQ7BSEuK");

export const StripeCheckoutModal = ({ clientSecret, onClose }: StripeCheckoutModalProps) => {
  const [loading, setLoading] = useState(true);

  const options = {
    clientSecret,
    onComplete: () => {
      // El pago se completó exitosamente
      setTimeout(() => {
        onClose();
        // Redireccionar o mostrar confirmación
        window.location.href = "/pago-exitoso";
      }, 2000);
    },
  };

  useEffect(() => {
    // Simular tiempo de carga del componente de Stripe
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-[400px] max-h-[70vh] overflow-y-auto">
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
      
      <div className="mt-4 pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={onClose}
          className="w-full"
        >
          Cancelar y cerrar
        </Button>
      </div>
    </div>
  );
};