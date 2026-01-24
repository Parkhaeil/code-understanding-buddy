import { useState } from "react";
import LandingPage from "@/components/LandingPage";
import MainDashboard from "@/components/MainDashboard";
import type { ProjectAnalysis, ProjectFiles } from "@/types/project";

type View = "landing" | "dashboard";

type DashboardSession = {
  analysis: ProjectAnalysis;
  projectFiles: ProjectFiles;
  getFileText: (path: string) => Promise<string>;
  sessionId?: string;
};

const Index = () => {
  const [currentView, setCurrentView] = useState<View>("landing");
  const [session, setSession] = useState<DashboardSession | null>(null);

  return (
    <>
      {currentView === "landing" ? (
        <LandingPage
          onStart={(payload) => {
            setSession(payload);
            setCurrentView("dashboard");
          }}
        />
      ) : (
        session && (
          <MainDashboard
            onBack={() => {
              setSession(null);
              setCurrentView("landing");
            }}
            analysis={session.analysis}
            projectFiles={session.projectFiles}
            getFileText={session.getFileText}
            sessionId={session.sessionId}
          />
        )
      )}
    </>
  );
};

export default Index;
