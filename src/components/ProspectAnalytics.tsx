import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Target, Calendar } from "lucide-react";
import { format, subWeeks, startOfWeek, endOfWeek } from "date-fns";

interface ProspectData {
  id: string;
  created_at: string;
  status: string;
}

export const ProspectAnalytics = () => {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<ProspectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("4weeks");

  useEffect(() => {
    if (user) {
      loadProspectData();
    }
  }, [user]);

  const loadProspectData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('confirmed_bookings')
        .select('id, created_at, status')
        .or(`setter_user_id.eq.${user?.id},closer_user_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProspects(data || []);
    } catch (error) {
      console.error('Error loading prospect data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "2weeks":
        startDate = subWeeks(now, 2);
        break;
      case "8weeks":
        startDate = subWeeks(now, 8);
        break;
      case "12weeks":
        startDate = subWeeks(now, 12);
        break;
      default: // 4weeks
        startDate = subWeeks(now, 4);
    }

    return prospects.filter(p => new Date(p.created_at) >= startDate);
  };

  const getWeeklyData = () => {
    const filteredProspects = getFilteredData();
    const weeklyData: { [key: string]: number } = {};

    filteredProspects.forEach(prospect => {
      const weekStart = startOfWeek(new Date(prospect.created_at));
      const weekKey = format(weekStart, 'MMM d');
      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
    });

    return Object.entries(weeklyData)
      .map(([week, count]) => ({ week, prospects: count }))
      .slice(-8); // Last 8 weeks max
  };

  const getStatusData = () => {
    const filteredProspects = getFilteredData();
    const statusCounts: { [key: string]: number } = {};

    filteredProspects.forEach(prospect => {
      const status = prospect.status === 'closed' ? 'Won' : 
                     prospect.status === 'lost' ? 'Lost' : 
                     'Active';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
      color: status === 'Won' ? '#22c55e' : status === 'Lost' ? '#ef4444' : '#3b82f6'
    }));
  };

  const calculateMetrics = () => {
    const filteredProspects = getFilteredData();
    const total = filteredProspects.length;
    const won = filteredProspects.filter(p => p.status === 'closed').length;
    const lost = filteredProspects.filter(p => p.status === 'lost').length;
    const active = total - won - lost;

    const winRate = total > 0 ? (won / (won + lost)) * 100 : 0;
    const conversionRate = total > 0 ? (won / total) * 100 : 0;
    
    const weeksInRange = timeRange === "2weeks" ? 2 : 
                        timeRange === "8weeks" ? 8 : 
                        timeRange === "12weeks" ? 12 : 4;
    const avgWeekly = total / weeksInRange;

    return { total, won, lost, active, winRate, conversionRate, avgWeekly };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">Loading analytics...</div>
      </div>
    );
  }

  const weeklyData = getWeeklyData();
  const statusData = getStatusData();
  const metrics = calculateMetrics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Prospect Analytics</h2>
          <p className="text-muted-foreground">Track your prospect acquisition and conversion metrics</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2weeks">Last 2 Weeks</SelectItem>
            <SelectItem value="4weeks">Last 4 Weeks</SelectItem>
            <SelectItem value="8weeks">Last 8 Weeks</SelectItem>
            <SelectItem value="12weeks">Last 12 Weeks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Prospects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.avgWeekly.toFixed(1)}/week avg
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4" />
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.winRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.won} wins / {metrics.won + metrics.lost} closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.won} wins / {metrics.total} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Active Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.active}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Acquisition Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Prospect Acquisition</CardTitle>
            <CardDescription>New prospects added each week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="prospects" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Prospect Status Distribution</CardTitle>
            <CardDescription>Current status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value, percent }) => 
                      `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {statusData.map((status) => (
                <div key={status.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm">{status.name}: {status.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};