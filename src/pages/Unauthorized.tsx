
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/AuthContext';

const Unauthorized = () => {
  const { user } = useAuth();

  const getDashboardPath = () => {
    switch (user?.role) {
      case 'master_admin':
        return '/master/dashboard';
      case 'company_super_admin':
      case 'company_admin':
        return '/company/dashboard';
      default:
        return '/';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        
        <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
        
        <p className="text-muted-foreground mb-6">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        
        <Link to={getDashboardPath()}>
          <Button className="w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Logged in as: <span className="font-medium">{user?.email}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Role: <span className="capitalize">{user?.role?.replace('_', ' ')}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
