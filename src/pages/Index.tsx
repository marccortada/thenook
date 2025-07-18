import { useState } from "react";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";
import ReservationSystem from "@/components/ReservationSystem";
import EmployeeManagement from "@/components/EmployeeManagement";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <Dashboard />;
      case "reservations":
        return <ReservationSystem />;
      case "employees":
        return <EmployeeManagement />;
      case "clients":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Gestión de Clientes</h2>
            <p className="text-muted-foreground">Esta sección estará disponible próximamente</p>
          </div>
        );
      case "settings":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Configuración</h2>
            <p className="text-muted-foreground">Esta sección estará disponible próximamente</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default Index;
