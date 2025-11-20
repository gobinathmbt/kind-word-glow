import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users, Car, CheckCircle, Activity, TrendingUp, Calendar as CalendarIcon, DollarSign, Clock, FileText, Settings, AlertTriangle, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { companyServices } from '@/api/services';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';

// Define interfaces for type safety
interface DashboardStats {
  totalVehicles?: number;
  vehicleGrowth?: number;
  activeInspections?: number;
  completedAppraisals?: number;
}

interface VehicleStats {
  distribution?: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
}

interface InspectionStats {
  monthlyData?: Array<{
    month: string;
    inspections: number;
  }>;
}

interface AppraisalStats {
  monthlyData?: Array<{
    month: string;
    appraisals: number;
  }>;
}

interface UserStats {
  totalUsers?: number;
  activeUsers?: number;
}

interface RevenueStats {
  totalRevenue?: number;
  growthRate?: number;
  monthlyData?: Array<{
    month: string;
    revenue: number;
  }>;
}

interface ActivityStats {
  monthlyData?: Array<{
    month: string;
    inspections: number;
    appraisals: number;
  }>;
}

interface PerformanceStats {
  avgProcessingTime?: string;
  topUsers?: Array<{
    name: string;
    completedTasks: number;
  }>;
}

interface SystemStats {
  efficiency?: number;
  pendingTasks?: number;
}

interface RecentActivity {
  id?: string | number;
  type: string;
  description?: string;
  vehicle?: string;
  user: string;
  status: string;
  time: string;
}

interface DashboardData {
  stats: DashboardStats;
  vehicleStats: VehicleStats;
  inspectionStats: InspectionStats;
  appraisalStats: AppraisalStats;
  userStats: UserStats;
  revenueStats: RevenueStats;
  activityStats: ActivityStats;
  performanceStats: PerformanceStats;
  systemStats: SystemStats;
  recentActivity: RecentActivity[];
}

const CompanyDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    stats: {},
    vehicleStats: {},
    inspectionStats: {},
    appraisalStats: {},
    userStats: {},
    revenueStats: {},
    activityStats: {},
    performanceStats: {},
    systemStats: {},
    recentActivity: []
  });

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadDashboardData = async (): Promise<void> => {
    setLoading(true);
    try {
      const params = {
        from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
      };

      const [
        statsResponse,
        vehicleResponse,
        inspectionResponse,
        appraisalResponse,
        userResponse,
        revenueResponse,
        activityResponse,
        performanceResponse,
        systemResponse,
        recentResponse
      ] = await Promise.all([
        companyServices.getDashboardStats(params),
        companyServices.getVehicleStats(params),
        companyServices.getInspectionStats(params),
        companyServices.getAppraisalStats(params),
        companyServices.getUserStats(params),
        companyServices.getRevenueStats(params),
        companyServices.getActivityStats(params),
        companyServices.getPerformanceStats(params),
        companyServices.getSystemStats(params),
        companyServices.getRecentActivity(params)
      ]);

      setDashboardData({
        stats: statsResponse.data.success ? statsResponse.data.data : {},
        vehicleStats: vehicleResponse.data.success ? vehicleResponse.data.data : {},
        inspectionStats: inspectionResponse.data.success ? inspectionResponse.data.data : {},
        appraisalStats: appraisalResponse.data.success ? appraisalResponse.data.data : {},
        userStats: userResponse.data.success ? userResponse.data.data : {},
        revenueStats: revenueResponse.data.success ? revenueResponse.data.data : {},
        activityStats: activityResponse.data.success ? activityResponse.data.data : {},
        performanceStats: performanceResponse.data.success ? performanceResponse.data.data : {},
        systemStats: systemResponse.data.success ? systemResponse.data.data : {},
        recentActivity: recentResponse.data.success ? recentResponse.data.data : []
      });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const handleDateRangeSelect = (range: DateRange | undefined): void => {
    setDateRange(range);
  };

  const { stats, vehicleStats, inspectionStats, appraisalStats, userStats, revenueStats, activityStats, performanceStats, systemStats, recentActivity } = dashboardData;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 p-3 sm:p-4 md:p-6">
      {/* Header with Date Filter */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Overview of your company's performance</p>
          </div>

          <div className="flex flex-col xs:flex-row gap-2 sm:flex-shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="justify-start text-left font-normal w-full xs:w-auto text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4"
                >
                  <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate text-xs sm:text-sm">
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, windowWidth < 640 ? "MMM dd" : "LLL dd, y")} -{" "}
                          {format(dateRange.to, windowWidth < 640 ? "MMM dd" : "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, windowWidth < 640 ? "MMM dd, yyyy" : "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={windowWidth < 768 ? 1 : 2}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            
            <div className="flex gap-2">
              <Button 
                onClick={loadDashboardData} 
                disabled={loading} 
                variant="outline"
                className="flex-1 xs:flex-none text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4"
              >
                <Activity className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
              
              <Button 
                onClick={() => toast.info('Export functionality coming soon')}
                variant="default"
                className="flex-1 xs:flex-none text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4"
              >
                <FileText className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Export</span>
                <span className="xs:hidden">Export</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Vehicles</CardTitle>
            <Car className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats?.totalVehicles || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.vehicleGrowth || 0} from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Inspections</CardTitle>
            <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats?.activeInspections || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Completed Appraisals</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stats?.completedAppraisals || 0}</div>
            <p className="text-xs text-muted-foreground">
              In selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">${revenueStats?.totalRevenue?.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">
              +{revenueStats?.growthRate || 0}% from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Team Members</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{userStats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {userStats?.activeUsers || 0} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Avg Processing Time</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{performanceStats?.avgProcessingTime || '0'}h</div>
            <p className="text-xs text-muted-foreground">
              Per inspection/appraisal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">System Efficiency</CardTitle>
            <Target className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{systemStats?.efficiency || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Overall performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending Tasks</CardTitle>
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{systemStats?.pendingTasks || 0}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl">Revenue Trend</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Monthly revenue over time</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={windowWidth < 640 ? 250 : 300}>
                <AreaChart data={revenueStats?.monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: windowWidth < 640 ? 10 : 12 }} />
                  <YAxis tick={{ fontSize: windowWidth < 640 ? 10 : 12 }} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Distribution */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl">Vehicle Distribution</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Vehicles by type and status</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={windowWidth < 640 ? 250 : 300}>
                <PieChart>
                  <Pie
                    data={vehicleStats?.distribution || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={windowWidth < 640 ? 60 : windowWidth < 1024 ? 70 : 80}
                    dataKey="value"
                    label={({ name, percent }: { name: string; percent: number }) =>
                      windowWidth < 640 ? `${(percent * 100).toFixed(0)}%` : `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={windowWidth >= 640}
                  >
                    {(vehicleStats?.distribution || []).map((entry, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* Activity Trends */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl">Activity Trends</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Inspections vs Appraisals</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={windowWidth < 640 ? 250 : 300}>
                <LineChart data={activityStats?.monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: windowWidth < 640 ? 10 : 12 }} />
                  <YAxis tick={{ fontSize: windowWidth < 640 ? 10 : 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="inspections" stroke="#3b82f6" strokeWidth={2} name="Inspections" />
                  <Line type="monotone" dataKey="appraisals" stroke="#10b981" strokeWidth={2} name="Appraisals" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Performance */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl">User Performance</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Top performing team members</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={windowWidth < 640 ? 250 : 300}>
                <BarChart data={performanceStats?.topUsers || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: windowWidth < 640 ? 10 : 12 }} 
                    angle={windowWidth < 640 ? -45 : 0} 
                    textAnchor={windowWidth < 640 ? "end" : "middle"} 
                    height={windowWidth < 640 ? 60 : 30} 
                  />
                  <YAxis tick={{ fontSize: windowWidth < 640 ? 10 : 12 }} />
                  <Tooltip />
                  <Bar dataKey="completedTasks" fill="#3b82f6" name="Completed Tasks" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">Recent Activity</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Latest system activities and updates</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="space-y-3 sm:space-y-4">
            {recentActivity.length > 0 ? recentActivity.map((activity, index: number) => (
              <div key={activity.id || index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {activity.type === 'Inspection' ? <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> :
                      activity.type === 'Appraisal' ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> :
                        <Car className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">{activity.description || activity.vehicle}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {activity.type} by {activity.user}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 sm:gap-1 flex-shrink-0">
                  <Badge
                    variant={
                      activity.status === 'Completed' ? 'default' :
                        activity.status === 'In Progress' ? 'secondary' : 'outline'
                    }
                    className="text-xs"
                  >
                    {activity.status}
                  </Badge>
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{activity.time}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-muted-foreground">
                No recent activity found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyDashboard;
