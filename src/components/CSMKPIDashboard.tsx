import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Settings, HeartHandshake, CheckCircle, TrendingUp, Star, Trash2 } from "lucide-react";
import { ShareLinkDialog } from "@/components/ShareLinkDialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface CSMKPIEntry {
  id: string;
  user_id: string;
  date: string;
  client_check_ins: number;
  issues_resolved: number;
  upsells_completed: number;
  client_satisfaction_score?: number;
  retention_rate?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CSMConfig {
  id: string;
  user_id: string;
  daily_check_ins_target: number;
  daily_issues_target: number;
  monthly_upsells_target: number;
  satisfaction_target: number;
  retention_target: number;
  created_at: string;
  updated_at: string;
}

export const CSMKPIDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [kpiEntries, setKpiEntries] = useState<CSMKPIEntry[]>([]);
  const [config, setConfig] = useState<CSMConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showEntryDialog, setShowEntryDialog] = useState(false);

  const entryForm = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      client_check_ins: 0,
      issues_resolved: 0,
      upsells_completed: 0,
      client_satisfaction_score: 0,
      retention_rate: 0,
      notes: '',
    },
  });

  const configForm = useForm({
    defaultValues: {
      daily_check_ins_target: 15,
      daily_issues_target: 8,
      monthly_upsells_target: 5,
      satisfaction_target: 4.5,
      retention_target: 95,
    },
  });

  const loadData = async () => {
    if (!user) return;

    try {
      const [entriesResult, configResult] = await Promise.all([
        supabase
          .from('csm_kpi_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
        supabase
          .from('csm_config')
          .select('*')
          .eq('user_id', user.id)
          .single()
      ]);

      if (entriesResult.data) {
        setKpiEntries(entriesResult.data);
      }

      if (configResult.data) {
        setConfig(configResult.data);
        configForm.reset(configResult.data);
      } else {
        // Create default config
        const defaultConfig = {
          user_id: user.id,
          daily_check_ins_target: 15,
          daily_issues_target: 8,
          monthly_upsells_target: 5,
          satisfaction_target: 4.5,
          retention_target: 95,
        };

        const { data } = await supabase
          .from('csm_config')
          .insert(defaultConfig)
          .select()
          .single();

        if (data) {
          setConfig(data);
          configForm.reset(data);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load KPI data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleEntrySubmit = async (data: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('csm_kpi_entries')
        .upsert({
          ...data,
          user_id: user.id,
          client_satisfaction_score: data.client_satisfaction_score ? parseFloat(data.client_satisfaction_score) : null,
          retention_rate: data.retention_rate ? parseFloat(data.retention_rate) : null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "KPI entry saved successfully",
      });

      setShowEntryDialog(false);
      entryForm.reset();
      loadData();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast({
        title: "Error",
        description: "Failed to save KPI entry",
        variant: "destructive",
      });
    }
  };

  const handleConfigSave = async (data: any) => {
    if (!user || !config) return;

    try {
      const { error } = await supabase
        .from('csm_config')
        .update({
          daily_check_ins_target: parseInt(data.daily_check_ins_target),
          daily_issues_target: parseInt(data.daily_issues_target),
          monthly_upsells_target: parseInt(data.monthly_upsells_target),
          satisfaction_target: parseFloat(data.satisfaction_target),
          retention_target: parseFloat(data.retention_target),
        })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Configuration updated successfully",
      });

      setShowConfigDialog(false);
      loadData();
    } catch (error) {
      console.error('Error updating config:', error);
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('csm_kpi_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (error) throw error;

      setKpiEntries(prev => prev.filter(entry => entry.id !== entryId));
      toast({
        title: "Success",
        description: "KPI entry deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete KPI entry",
        variant: "destructive",
      });
    }
  };

  const todayEntry = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return kpiEntries.find(entry => entry.date === today);
  }, [kpiEntries]);

  const monthlyUpsells = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return kpiEntries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
      })
      .reduce((sum, entry) => sum + entry.upsells_completed, 0);
  }, [kpiEntries]);

  const chartData = useMemo(() => {
    return kpiEntries
      .slice(0, 30)
      .reverse()
      .map(entry => ({
        date: new Date(entry.date).toLocaleDateString(),
        client_check_ins: entry.client_check_ins,
        issues_resolved: entry.issues_resolved,
        upsells_completed: entry.upsells_completed,
        satisfaction_score: entry.client_satisfaction_score || 0,
        retention_rate: entry.retention_rate || 0,
      }));
  }, [kpiEntries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Client Success Manager KPI Dashboard</h2>
          <p className="text-muted-foreground">Track client satisfaction and success metrics</p>
        </div>
        <div className="flex gap-2">
          <ShareLinkDialog kpiType="csm" />
          <Dialog open={showEntryDialog} onOpenChange={setShowEntryDialog}>
            <DialogTrigger asChild>
              <Button>Add Entry</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add KPI Entry</DialogTitle>
                <DialogDescription>Record your daily client success metrics</DialogDescription>
              </DialogHeader>
              <Form {...entryForm}>
                <form onSubmit={entryForm.handleSubmit(handleEntrySubmit)} className="space-y-4">
                  <FormField
                    control={entryForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={entryForm.control}
                      name="client_check_ins"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Check-ins</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={entryForm.control}
                      name="issues_resolved"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issues Resolved</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={entryForm.control}
                      name="upsells_completed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Upsells Completed</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={entryForm.control}
                      name="client_satisfaction_score"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Satisfaction Score (1-5)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" min="1" max="5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={entryForm.control}
                    name="retention_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retention Rate (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" min="0" max="100" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={entryForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Daily notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">Save Entry</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configure Targets</DialogTitle>
                <DialogDescription>Set your daily and performance targets</DialogDescription>
              </DialogHeader>
              <Form {...configForm}>
                <form onSubmit={configForm.handleSubmit(handleConfigSave)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={configForm.control}
                      name="daily_check_ins_target"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Daily Check-ins Target</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={configForm.control}
                      name="daily_issues_target"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Daily Issues Target</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={configForm.control}
                      name="monthly_upsells_target"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Upsells Target</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={configForm.control}
                      name="satisfaction_target"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Satisfaction Target (1-5)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" min="1" max="5" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={configForm.control}
                    name="retention_target"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retention Target (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" min="0" max="100" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">Save Configuration</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {todayEntry ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Client Check-ins</CardTitle>
                  <HeartHandshake className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todayEntry.client_check_ins}</div>
                  <Progress 
                    value={(todayEntry.client_check_ins / (config?.daily_check_ins_target || 1)) * 100} 
                    className="mt-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Target: {config?.daily_check_ins_target || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Issues Resolved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todayEntry.issues_resolved}</div>
                  <Progress 
                    value={(todayEntry.issues_resolved / (config?.daily_issues_target || 1)) * 100} 
                    className="mt-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Target: {config?.daily_issues_target || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Upsells</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{monthlyUpsells}</div>
                  <Progress 
                    value={(monthlyUpsells / (config?.monthly_upsells_target || 1)) * 100} 
                    className="mt-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Target: {config?.monthly_upsells_target || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {todayEntry.client_satisfaction_score?.toFixed(1) || 'N/A'}
                  </div>
                  {todayEntry.client_satisfaction_score && (
                    <Progress 
                      value={(todayEntry.client_satisfaction_score / (config?.satisfaction_target || 1)) * 100} 
                      className="mt-2" 
                    />
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Target: {config?.satisfaction_target || 0}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">No data recorded for today. Add your first entry!</p>
              </CardContent>
            </Card>
          )}

          {kpiEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {kpiEntries.slice(0, 7).map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{new Date(entry.date).toLocaleDateString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {entry.client_check_ins} check-ins • {entry.issues_resolved} issues • {entry.upsells_completed} upsells
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {entry.client_satisfaction_score ? `${entry.client_satisfaction_score.toFixed(1)}⭐` : 'No rating'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {chartData.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Daily Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="client_check_ins" stroke="hsl(var(--primary))" name="Check-ins" />
                      <Line type="monotone" dataKey="issues_resolved" stroke="hsl(var(--secondary))" name="Issues Resolved" />
                      <Line type="monotone" dataKey="upsells_completed" stroke="hsl(var(--accent))" name="Upsells" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Satisfaction & Retention</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="satisfaction_score" fill="hsl(var(--primary))" name="Satisfaction Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">No data available for analytics</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};