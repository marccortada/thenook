import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import GiftCardManagement from "@/components/GiftCardManagement";

const GiftCardsManagementPage = () => {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = "Gestión de Tarjetas Regalo | The Nook Madrid";
  }, []);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <main className="container mx-auto px-4 py-6">
      <article>
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Tarjetas Regalo</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona todas las tarjetas regalo, busca por códigos o nombres, y crea nuevas tarjetas.
            </p>
          </div>
          <Button variant="outline" onClick={goBack}>Volver</Button>
        </header>
        <GiftCardManagement />
      </article>
    </main>
  );
};

export default GiftCardsManagementPage;