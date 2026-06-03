import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnifiedSearch } from "@/components/UnifiedSearch";
import { Users, GraduationCap, Settings, BarChart3, Target, MessageSquare, Phone, Building } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { primaryRole, primaryBusiness, roleActivity, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [recentActivity, setRecentActivity] = useState({
    leads: 0,
    prospects: 0,
    bookings: 0,
    kpiEntries: 0
  });

  const getBusinessDisplayName = () => {
    switch (primaryBusiness) {
      case 'academy': return 'Pallet Pros Academy';
      case 'crm': return 'Business CRM';
      case 'hybrid': return 'Multi-Business';
      default: return 'Workspace';
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && !roleLoading) {
      loadRecentActivity();
    }
  }, [user, roleLoading]);

  const loadRecentActivity = async () => {
    if (!user) return;

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      if (primaryBusiness === 'crm') {
        // Only load CRM data
        const [leads] = await Promise.all([
          supabase.from('leads').select('id').eq('user_id', user.id).gte('created_at', sevenDaysAgo.toISOString())
        ]);

        setRecentActivity({
          leads: leads.data?.length || 0,
          prospects: 0,
          bookings: 0,
          kpiEntries: 0
        });
      } else if (primaryBusiness === 'academy') {
        // Only load Academy data
        const [prospects, bookings, kpiEntries] = await Promise.all([
          supabase.from('prospects').select('id').eq('user_id', user.id).gte('created_at', sevenDaysAgo.toISOString()),
          supabase.from('confirmed_bookings').select('id').eq('setter_user_id', user.id).gte('created_at', sevenDaysAgo.toISOString()),
          supabase.from('setter_kpi_entries').select('id').eq('user_id', user.id).gte('date', sevenDaysAgo.toISOString().split('T')[0])
        ]);

        setRecentActivity({
          leads: 0,
          prospects: prospects.data?.length || 0,
          bookings: bookings.data?.length || 0,
          kpiEntries: kpiEntries.data?.length || 0
        });
      } else {
        // Load all data for hybrid users
        const [leads, prospects, bookings, kpiEntries] = await Promise.all([
          supabase.from('leads').select('id').eq('user_id', user.id).gte('created_at', sevenDaysAgo.toISOString()),
          supabase.from('prospects').select('id').eq('user_id', user.id).gte('created_at', sevenDaysAgo.toISOString()),
          supabase.from('confirmed_bookings').select('id').eq('setter_user_id', user.id).gte('created_at', sevenDaysAgo.toISOString()),
          supabase.from('setter_kpi_entries').select('id').eq('user_id', user.id).gte('date', sevenDaysAgo.toISOString().split('T')[0])
        ]);

        setRecentActivity({
          leads: leads.data?.length || 0,
          prospects: prospects.data?.length || 0,
          bookings: bookings.data?.length || 0,
          kpiEntries: kpiEntries.data?.length || 0
        });
      }
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'setter': return 'Setter';
      case 'closer': return 'Closer';
      case 'csm': return 'CSM';
      case 'business': return 'Business';
      case 'hybrid': return 'Hybrid';
      default: return 'User';
    }
  };

  const getQuickActions = () => {
    const actions = [];
    
    if (primaryBusiness === 'academy' || primaryBusiness === 'hybrid') {
      actions.push(
        { icon: MessageSquare, label: 'Add Prospect', action: () => navigate('/academy') },
        { icon: Target, label: 'Log KPIs', action: () => navigate('/academy') }
      );
    }
    
    if (primaryBusiness === 'crm' || primaryBusiness === 'hybrid') {
      actions.push(
        { icon: Building, label: 'Add Lead', action: () => navigate('/crm') },
        { icon: Phone, label: 'Track Clients', action: () => navigate('/crm') }
      );
    }

    return actions.slice(0, 4); // Limit to 4 quick actions
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{getBusinessDisplayName()}</h1>
              {primaryRole && (
                <Badge variant="secondary" className="text-sm">
                  {getRoleDisplayName(primaryRole)} Mode
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
              <div className="hidden sm:block">
                <UnifiedSearch businessContext={primaryBusiness} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/settings")}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">Welcome back, {user.email}</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">Choose Your Platform</h2>
          <p className="text-xl text-muted-foreground">
            Select the platform you'd like to access
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/crm")}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Business CRM</CardTitle>
              <CardDescription className="text-lg">
                Manage leads, track clients, and analyze business performance
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li>• Lead management and tracking</li>
                <li>• Client relationship management</li>
                <li>• Analytics and reporting</li>
                <li>• LTV calculations</li>
              </ul>
              <Button className="w-full" size="lg">
                Access Business CRM
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/academy")}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
                <GraduationCap className="w-8 h-8 text-secondary" />
              </div>
              <CardTitle className="text-2xl">Pallet Pros Academy</CardTitle>
              <CardDescription className="text-lg">
                Track Instagram DM setter KPIs and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li>• Daily KPI tracking</li>
                <li>• Performance analytics</li>
                <li>• Conversion rate monitoring</li>
                <li>• Historical data insights</li>
              </ul>
              <Button className="w-full" size="lg" variant="secondary">
                Access Academy
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;