import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  Bell,
  User,
  LogOut,
  Car,
  BarChart3,
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  FileCheck,
  Settings,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SupplierLayoutProps {
  children: React.ReactNode;
  title: string;
}

interface NavigationItem {
  icon: any;
  label: string;
  path: string;
  description?: string;
  count?: number;
}

const SupplierLayout: React.FC<SupplierLayoutProps> = ({
  children,
  title,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Get supplier info from session storage
  const supplierInfo = JSON.parse(sessionStorage.getItem('supplier_user') || '{}');

  const navigationItems: NavigationItem[] = [
    {
      icon: BarChart3,
      label: 'Dashboard',
      path: '/supplier/dashboard',
      description: 'Overview and statistics',
    },
    {
      icon: ClipboardList,
      label: 'Quote Requests',
      path: '/supplier/quotes/quote_request',
      description: 'Pending quote requests',
    },
    {
      icon: CheckCircle,
      label: 'Quote Approved',
      path: '/supplier/quotes/quote_approved',
      description: 'Approved quotes',
    },
    {
      icon: XCircle,
      label: 'Quote Rejected',
      path: '/supplier/quotes/quote_rejected',
      description: 'Rejected quotes',
    },
    {
      icon: Clock,
      label: 'Work In Progress',
      path: '/supplier/quotes/work_in_progress',
      description: 'Ongoing work',
    },
    {
      icon: FileCheck,
      label: 'Work Review',
      path: '/supplier/quotes/work_review',
      description: 'Work under review',
    },
    {
      icon: FileCheck,
      label: 'Completed Jobs',
      path: '/supplier/quotes/completed_jobs',
      description: 'Finished work',
    },
    {
      icon: XCircle,
      label: 'Rework',
      path: '/supplier/quotes/rework',
      description: 'Rework required',
    }
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('supplier_token');
    sessionStorage.removeItem('supplier_user');
    navigate('/login');
  };

  const isMenuActive = (item: NavigationItem): boolean => {
    return location.pathname === item.path;
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`p-4 border-b ${isSidebarCollapsed && !isMobile ? 'px-4' : ''}`}>
        <div className="flex items-center space-x-2">
          <Car className="h-6 w-6 text-primary flex-shrink-0" />
          {(!isSidebarCollapsed || isMobile) && (
            <div>
              <span className="text-lg font-bold">Supplier Portal</span>
              {supplierInfo?.supplier_shop_name && (
                <p className="text-xs text-muted-foreground truncate">
                  {supplierInfo.supplier_shop_name}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 p-2 space-y-1 overflow-y-auto ${isSidebarCollapsed && !isMobile ? 'px-2' : ''}`}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = isMenuActive(item);
          
          if (isSidebarCollapsed && !isMobile) {
            return (
              <TooltipProvider key={item.path}>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.path}
                      className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'bg-primary text-primary-foreground shadow-sm' 
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                      onClick={() => isMobile && setIsMobileMenuOpen(false)}
                    >
                      <Icon className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex flex-col">
                    <span className="font-medium">{item.label}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={() => isMobile && setIsMobileMenuOpen(false)}
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'}`} />
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm truncate ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {item.label}
                </div>
                {item.description && (
                  <div className={`text-xs truncate ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {item.description}
                  </div>
                )}
              </div>
              {item.count && item.count > 0 && (
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className="text-xs flex-shrink-0"
                >
                  {item.count}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile - Moved to bottom */}
      <div className={`p-3 border-t ${isSidebarCollapsed && !isMobile ? 'px-2' : ''}`}>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              className={`w-full ${isSidebarCollapsed && !isMobile ? 'h-10 px-2' : 'justify-start'}`}
            >
              <User className="h-4 w-4 flex-shrink-0" />
              {(!isSidebarCollapsed || isMobile) && (
                <div className="ml-2 text-left flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {supplierInfo?.name || 'Supplier'}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {supplierInfo?.email || ''}
                  </div>
                </div>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="end">
            <div className="space-y-2">
              <Link
                to="/supplier/profile"
                className="flex items-center space-x-2 w-full p-2 hover:bg-accent rounded-sm"
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                <Settings className="h-4 w-4" />
                <span className="text-sm">Profile Settings</span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="h-screen bg-background flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className={`hidden lg:flex flex-col bg-card border-r transition-all duration-300 ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}>
          <SidebarContent />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent isMobile />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="bg-card border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Sheet>

              {/* Desktop Sidebar Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden lg:flex"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div>
                <h1 className="text-xl font-semibold lg:text-xl text-lg">{title}</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  {supplierInfo?.supplier_shop_name || 'Supplier Portal'}
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
                  0
                </Badge>
              </Button>
            </div>
          </header>

          {/* Page Content with Scroll */}
          <main className="flex-1 overflow-y-auto">
            <div className=" h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default SupplierLayout;