import React from 'react';

interface DashboardHeaderProps {
  children: React.ReactNode;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ children }) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Advanced Analytics Dashboard</h2>
        <p className="text-muted-foreground">Comprehensive insights across all business operations</p>
      </div>
      <div className="flex items-center gap-4">
        {children}
      </div>
    </div>
  );
};
