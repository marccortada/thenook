import { useEffect } from "react";
import PackageManagement from "@/components/PackageManagement";

const PackagesPage = () => {
  useEffect(() => {
    document.title = "Bonos y Tarjetas de Regalo | The Nook Madrid";
  }, []);

  return (
    <main className="container mx-auto px-4 py-6">
      <article>
        <header className="mb-4">
          <h1 className="text-2xl font-bold">Bonos y Tarjetas de Regalo</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona todos los bonos. Las tarjetas de regalo estarán disponibles próximamente.
          </p>
        </header>
        <PackageManagement />
      </article>
    </main>
  );
};

export default PackagesPage;
