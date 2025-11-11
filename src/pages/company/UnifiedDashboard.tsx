import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Dashboard from './Dashboard';
import AnalyticsDashboard from './AnalyticsDashboard';
import AnalyticsDashboardTabs from '@/components/dashboard/AnalyticsDashboardTabs';

// Cookie utilities
const setCookie = (name: string, value: string, days: number = 30) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const UnifiedDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Load saved tab from cookie on mount
  useEffect(() => {
    const savedTab = getCookie('unified_dashboard_active_tab');
    if (savedTab && (savedTab === 'dashboard' || savedTab === 'analytics')) {
      setActiveTab(savedTab);
    }
  }, []);

  // Save tab selection to cookie
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCookie('unified_dashboard_active_tab', value);
  };

  return (
    <DashboardLayout title="Dashboard">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="border-b bg-background sticky top-0 z-10">
          <TabsList className="w-full justify-start h-12 bg-transparent p-0">
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6"
            >
              Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="mt-0">
          <Dashboard />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <AnalyticsDashboardTabs />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default UnifiedDashboard;
