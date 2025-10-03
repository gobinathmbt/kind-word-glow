import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
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
    <DashboardLayout title="Company Dashboard">
      <div className="space-y-8">
        {/* Header with Date Filter */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">Overview of your company's performance</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Button onClick={loadDashboardData} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Main Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalVehicles || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{stats?.vehicleGrowth || 0} from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Inspections</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeInspections || 0}</div>
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Appraisals</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.completedAppraisals || 0}</div>
              <p className="text-xs text-muted-foreground">
                In selected period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${revenueStats?.totalRevenue?.toLocaleString() || '0'}</div>
              <p className="text-xs text-muted-foreground">
                +{revenueStats?.growthRate || 0}% from last period
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {userStats?.activeUsers || 0} active users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceStats?.avgProcessingTime || '0'}h</div>
              <p className="text-xs text-muted-foreground">
                Per inspection/appraisal
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Efficiency</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats?.efficiency || 0}%</div>
              <p className="text-xs text-muted-foreground">
                Overall performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats?.pendingTasks || 0}</div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueStats?.monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Vehicle Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Distribution</CardTitle>
              <CardDescription>Vehicles by type and status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={vehicleStats?.distribution || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }: { name: string; percent: number }) => 
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {(vehicleStats?.distribution || []).map((entry, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Trends</CardTitle>
              <CardDescription>Inspections vs Appraisals</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityStats?.monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="inspections" stroke="#3b82f6" strokeWidth={2} name="Inspections" />
                  <Line type="monotone" dataKey="appraisals" stroke="#10b981" strokeWidth={2} name="Appraisals" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* User Performance */}
          <Card>
            <CardHeader>
              <CardTitle>User Performance</CardTitle>
              <CardDescription>Top performing team members</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceStats?.topUsers || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completedTasks" fill="#3b82f6" name="Completed Tasks" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system activities and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? recentActivity.map((activity, index: number) => (
                <div key={activity.id || index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {activity.type === 'Inspection' ? <Activity className="h-5 w-5 text-primary" /> : 
                       activity.type === 'Appraisal' ? <CheckCircle className="h-5 w-5 text-primary" /> :
                       <Car className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <p className="font-medium">{activity.description || activity.vehicle}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.type} by {activity.user}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={
                        activity.status === 'Completed' ? 'default' :
                        activity.status === 'In Progress' ? 'secondary' : 'outline'
                      }
                    >
                      {activity.status}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recent activity found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CompanyDashboard;