import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PaymentCanceled = () => {
  return (
    <main className="container mx-auto px-4 py-10">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Pago cancelado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Has cancelado el proceso de pago. Puedes reintentarlo cuando quieras.</p>
          <div className="flex gap-2 pt-4">
            <Button asChild><Link to="/">Volver al inicio</Link></Button>
            <Button variant="outline" asChild><Link to="/tarjetas-regalo">Tarjetas de regalo</Link></Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default PaymentCanceled;
