import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Smartphone, Wallet } from "lucide-react";

export function PaymentMethodsInfo() {
  return (
    <Card className="border-border/20 bg-gradient-to-r from-accent/5 to-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>Tarjeta</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span>Apple Pay</span>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span>PayPal</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span>Bizum</span>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Pago 100% seguro procesado por Stripe
        </p>
      </CardContent>
    </Card>
  );
}