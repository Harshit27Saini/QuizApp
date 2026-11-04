import React from 'react';
import { SidebarNav } from './SidebarNav';
import { RightWidgetSidebar } from './RightWidgetSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="app-layout-3col">
      {/* Column 1: Left Navigation Sidebar */}
      <SidebarNav />

      {/* Column 2: Center Main Feed */}
      <main className="main-feed">
        {children}
      </main>

      {/* Column 3: Right Widget & Companion Sidebar */}
      <RightWidgetSidebar />
    </div>
  );
};
