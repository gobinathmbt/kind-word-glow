
import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/auth/AuthContext';

const NoAccess = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-10 w-10 text-muted-foreground" />
        </div>
        
        <h1 className="text-3xl font-bold mb-4">Access Restricted</h1>
        
        <p className="text-muted-foreground mb-6">
          You don't have access to any modules. Please contact your administrator to get the necessary permissions.
        </p>
        
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Administrator can assign module permissions from the User Management section.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/company/dashboard">
              <Button variant="outline" className="w-full sm:w-auto">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            
            <Button onClick={logout} variant="default" className="w-full sm:w-auto">
              Logout
            </Button>
          </div>
        </div>
        
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

export default NoAccess;
