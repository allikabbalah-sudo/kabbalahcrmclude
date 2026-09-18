import type { ReactNode } from "react";
import { SidebarNav } from "./SidebarNav";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <SidebarNav />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
