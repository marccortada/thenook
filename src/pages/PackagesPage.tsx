import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PackageManagement from "@/components/PackageManagement";

const PackagesPage = () => {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = "Bonos y Tarjetas de Regalo | The Nook Madrid";
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
            <h1 className="text-2xl font-bold">Bonos y Tarjetas de Regalo</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona todos los bonos. Las tarjetas de regalo estarán disponibles próximamente.
            </p>
          </div>
          <Button variant="outline" onClick={goBack}>Volver</Button>
        </header>
        <PackageManagement />
      </article>
    </main>
  );
};

export default PackagesPage;
