import { useState } from "react";
import LandingPage from "@/components/LandingPage";
import MainDashboard from "@/components/MainDashboard";

type View = "landing" | "dashboard";

const Index = () => {
  const [currentView, setCurrentView] = useState<View>("landing");

  return (
    <>
      {currentView === "landing" ? (
        <LandingPage onStart={() => setCurrentView("dashboard")} />
      ) : (
        <MainDashboard onBack={() => setCurrentView("landing")} />
      )}
    </>
  );
};

export default Index;
