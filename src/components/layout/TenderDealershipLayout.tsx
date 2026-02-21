import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  Bell,
  User,
  LogOut,
  LayoutDashboard,
  Users,
  UserCircle,
  Settings,
  FileText,
  Package,
  ChevronDown,
  ChevronRight,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import logo from "@/assests/logo/android-chrome-512x512.png";
import { toast } from "sonner";
import apiClient from "@/api/axios";

interface TenderDealershipLayoutProps {
  children: React.ReactNode;
  title: string;
}

interface NavigationItem {
  icon: any;
  label: string;
  path?: string;
  description?: string;
  count?: number;
  roleRequired?: string[];
  children?: NavigationSubItem[];
}

interface NavigationSubItem {
  label: string;
  path: string;
  description?: string;
}

const TenderDealershipLayout: React.FC<TenderDealershipLayoutProps> = ({
  children,
  title,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'Quotes': true,
    'Orders': true,
  });
  const mainContentRef = useRef<HTMLElement>(null);

  // Get dealership user info from session storage
  const dealershipUser = JSON.parse(sessionStorage.getItem('tender_dealership_user') || '{}');
  const dealershipInfo = JSON.parse(sessionStorage.getItem('tender_dealership_info') || '{}');

  // Prevent auto-scroll to top on route changes when clicking sidebar menu
  useEffect(() => {
    // Disable automatic scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Prevent scroll to top when location changes
  const prevPathnameRef = useRef<string>(location.pathname);
  useEffect(() => {
    // Only handle if pathname actually changed
    if (prevPathnameRef.current !== location.pathname) {
      prevPathnameRef.current = location.pathname;
    }
  }, [location.pathname]);

  // Check if user has required role for menu item
  const hasRequiredRole = (roleRequired?: string[]): boolean => {
    if (!roleRequired || roleRequired.length === 0) return true;
    const userRole = dealershipUser?.role || '';
    return roleRequired.includes(userRole);
  };

  const navigationItems: NavigationItem[] = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/tender-dealership/dashboard',
      description: 'Overview and statistics',
    },
    {
      icon: Users,
      label: 'Users',
      path: '/tender-dealership/users',
      description: 'Manage dealership users',
      roleRequired: ['primary_tender_dealership_user'],
    },
    {
      icon: FileText,
      label: 'Quotes',
      description: 'Manage your quotes',
      children: [
        { label: 'Open', path: '/tender-dealership/quotes/Open', description: 'New tender requests' },
        { label: 'In Progress', path: '/tender-dealership/quotes/In%20Progress', description: 'Drafts being worked on' },
        { label: 'Submitted', path: '/tender-dealership/quotes/Submitted', description: 'Quotes under review' },
        { label: 'Withdrawn', path: '/tender-dealership/quotes/Withdrawn', description: 'Withdrawn quotes' },
        { label: 'Closed', path: '/tender-dealership/quotes/Closed', description: 'Not selected quotes' },
      ],
    },
    {
      icon: Package,
      label: 'Orders',
      description: 'View your orders',
      children: [
        { label: 'Approved', path: '/tender-dealership/orders/Order%20-%20Approved', description: 'Newly approved orders' },
        { label: 'Accepted', path: '/tender-dealership/orders/Accepted', description: 'Orders you accepted' },
        { label: 'Delivered', path: '/tender-dealership/orders/Delivered', description: 'Completed deliveries' },
        { label: 'Aborted', path: '/tender-dealership/orders/Aborted', description: 'Cancelled orders' },
      ],
    },
    {
      icon: UserCircle,
      label: 'Profile',
      path: '/tender-dealership/profile',
      description: 'Your profile settings',
    },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('tender_dealership_token');
    sessionStorage.removeItem('tender_dealership_user');
    sessionStorage.removeItem('tender_dealership_info');
    navigate('/login');
  };

  const toggleMenu = (menuLabel: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuLabel]: !prev[menuLabel]
    }));
  };

  const isMenuActive = (item: NavigationItem): boolean => {
    // For items with children, check if any child path matches
    if (item.children) {
      return item.children.some(child => location.pathname === child.path);
    }
    // For quotes and orders, check if the path starts with the base path
    if (item.path?.includes('/quotes/') && location.pathname.startsWith('/tender-dealership/quotes/')) {
      return true;
    }
    if (item.path?.includes('/orders/') && location.pathname.startsWith('/tender-dealership/orders/')) {
      return true;
    }
    return location.pathname === item.path;
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`p-4 border-b ${isSidebarCollapsed && !isMobile ? 'px-4' : ''}`}>
        <div className="flex items-center space-x-2">
          <img src={logo} className="h-6 w-6 text-primary flex-shrink-0" />
          {(!isSidebarCollapsed || isMobile) && (
            <span className="text-lg font-bold">Auto Erp</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 p-2 space-y-1 overflow-y-auto ${isSidebarCollapsed && !isMobile ? 'px-2' : ''}`}>
        {navigationItems
          .filter(item => hasRequiredRole(item.roleRequired))
          .map((item) => {
            const Icon = item.icon;
            const isActive = isMenuActive(item);
            
            // Collapsed sidebar - show icon only
            if (isSidebarCollapsed && !isMobile) {
              return (
                <TooltipProvider key={item.label}>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      {item.children ? (
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 cursor-pointer ${
                            isActive 
                              ? 'bg-primary text-primary-foreground shadow-sm' 
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                      ) : (
                        <Link
                          to={item.path!}
                          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
                            isActive 
                              ? 'bg-primary text-primary-foreground shadow-sm' 
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          }`}
                          onClick={() => isMobile && setIsMobileMenuOpen(false)}
                        >
                          <Icon className="h-4 w-4" />
                        </Link>
                      )}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex flex-col">
                      <span className="font-medium">{item.label}</span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      )}
                      {item.children && (
                        <div className="mt-2 space-y-1">
                          {item.children.map(child => (
                            <Link
                              key={child.path}
                              to={child.path}
                              className="block px-2 py-1 text-xs hover:bg-accent rounded"
                              onClick={() => isMobile && setIsMobileMenuOpen(false)}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }
            
            // Expanded sidebar - show full menu with collapsible children
            if (item.children) {
              const isExpanded = expandedMenus[item.label] !== false; // Default to true if not set
              
              return (
                <Collapsible key={item.label} open={isExpanded} onOpenChange={() => toggleMenu(item.label)}>
                  <CollapsibleTrigger className={`group flex items-center justify-between w-full px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'}`} />
                      <div className="flex-1 min-w-0 text-left">
                        <div className={`font-medium text-sm truncate ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                          {item.label}
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''} ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 ml-7 space-y-1">
                    {item.children.map(child => {
                      const isChildActive = location.pathname === child.path;
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`block px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                            isChildActive
                              ? 'bg-accent text-accent-foreground font-medium'
                              : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                          }`}
                          onClick={() => isMobile && setIsMobileMenuOpen(false)}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            }
            
            // Regular menu item without children
            return (
              <Link
                key={item.path}
                to={item.path!}
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
                    {dealershipUser?.username || 'User'}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {dealershipUser?.email || ''}
                  </div>
                </div>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="end">
            <div className="space-y-2">
              <Link
                to="/tender-dealership/profile"
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
                  {dealershipInfo?.dealership_name || 'Dealership Portal'}
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

              {dealershipInfo?.dealership_id && (
                <Badge variant="outline" className="text-xs">
                  Dealership ID: {dealershipInfo.dealership_id}
                </Badge>
              )}

              {dealershipInfo?.company_id && (
                <Badge variant="outline" className="text-xs">
                  Company ID: {dealershipInfo.company_id}
                </Badge>
              )}
            </div>
          </header>

          {/* Page Content with Scroll */}
          <main ref={mainContentRef} className="flex-1 overflow-y-auto">
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TenderDealershipLayout;
