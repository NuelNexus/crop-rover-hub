import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import TopBar from "./TopBar";
import OnboardingGuide from "@/components/onboarding/OnboardingGuide";

const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
      <OnboardingGuide />
    </div>
  );
};

export default AppLayout;
