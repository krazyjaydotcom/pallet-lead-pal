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
import { Settings, DollarSign, Target, TrendingUp, Users, Trash2, UserX } from "lucide-react";
import { formatPhoneNumber } from "@/utils/phoneFormat";
import { ShareLinkDialog } from "@/components/ShareLinkDialog";
import { ConfirmedBookingsList } from "@/components/ConfirmedBookingsList";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface CloserKPIEntry {
  id: string;
  user_id: string;
  date: string;
  units_sold: number;
  calls_made: number;
  clients_signed: number;
  cash_collected: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CloserConfig {
  id: string;
  user_id: string;
  closing_rate_target: number;
  daily_units_target: number;
  daily_clients_target: number;
  cash_per_call_target: number;
  created_at: string;
  updated_at: string;
}

interface NoCallNoShow {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const CloserKPIDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [kpiEntries, setKpiEntries] = useState<CloserKPIEntry[]>([]);
  const [config, setConfig] = useState<CloserConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [showNoCallDialog, setShowNoCallDialog] = useState(false);

  const entryForm = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      units_sold: 0,
      calls_made: 0,
      clients_signed: 0,
      cash_collected: 0,
      notes: '',
    },
  });

  const configForm = useForm({
    defaultValues: {
      closing_rate_target: 40,
      daily_units_target: 10,
      daily_clients_target: 5,
      cash_per_call_target: 500,
    },
  });

  const noCallForm = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      notes: '',
    },
  });

  const loadData = async () => {
    if (!user) return;

    try {
      const [entriesResult, configResult] = await Promise.all([
        supabase
          .from('closer_kpi_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
        supabase
          .from('closer_config')
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
          closing_rate_target: 40,
          daily_units_target: 10,
          daily_clients_target: 5,
          cash_per_call_target: 500,
        };

        const { data } = await supabase
          .from('closer_config')
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
        .from('closer_kpi_entries')
        .upsert({
          ...data,
          user_id: user.id,
          cash_collected: parseFloat(data.cash_collected),
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
        .from('closer_config')
        .update({
          closing_rate_target: parseFloat(data.closing_rate_target),
          daily_units_target: parseInt(data.daily_units_target),
          daily_clients_target: parseInt(data.daily_clients_target),
          cash_per_call_target: parseFloat(data.cash_per_call_target),
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
        .from('closer_kpi_entries')
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

  const handleNoCallSubmit = async (data: any) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('no_call_no_shows')
        .insert({
          ...data,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "No-call/no-show recorded successfully",
      });

      setShowNoCallDialog(false);
      noCallForm.reset();
    } catch (error) {
      console.error('Error saving no-call/no-show:', error);
      toast({
        title: "Error",
        description: "Failed to record no-call/no-show",
        variant: "destructive",
      });
    }
  };

  const todayEntry = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return kpiEntries.find(entry => entry.date === today);
  }, [kpiEntries]);

  const calculateClosingRate = (entry: CloserKPIEntry) => {
    if (entry.calls_made === 0) return 0;
    return (entry.clients_signed / entry.calls_made) * 100;
  };

  const calculateCashPerCall = (entry: CloserKPIEntry) => {
    if (entry.calls_made === 0) return 0;
    return entry.cash_collected / entry.calls_made;
  };

  const chartData = useMemo(() => {
    return kpiEntries
      .slice(0, 30)
      .reverse()
      .map(entry => ({
        date: new Date(entry.date).toLocaleDateString(),
        units_sold: entry.units_sold,
        clients_signed: entry.clients_signed,
        cash_collected: entry.cash_collected,
        closing_rate: calculateClosingRate(entry),
        cash_per_call: calculateCashPerCall(entry),
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
          <h2 className="text-3xl font-bold text-foreground">Closer KPI Dashboard</h2>
          <p className="text-muted-foreground">Track your closing performance and sales metrics</p>
        </div>
        <div className="flex gap-2">
          <ShareLinkDialog kpiType="closer" />

          
          <Dialog open={showNoCallDialog} onOpenChange={setShowNoCallDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <UserX className="w-4 h-4 mr-2" />
                No Call/No Show
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record No Call/No Show</DialogTitle>
                <DialogDescription>Enter client details for tracking purposes</DialogDescription>
              </DialogHeader>
              <Form {...noCallForm}>
                <form onSubmit={noCallForm.handleSubmit(handleNoCallSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={noCallForm.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={noCallForm.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={noCallForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={noCallForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder="(555) 123-4567" 
                            {...field}
                            onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={noCallForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" variant="destructive" className="w-full">Record No Show</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={showEntryDialog} onOpenChange={setShowEntryDialog}>
            <DialogTrigger asChild>
              <Button>Add Entry</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add KPI Entry</DialogTitle>
                <DialogDescription>Record your daily closing metrics</DialogDescription>
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
                      name="units_sold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Units Sold</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={entryForm.control}
                      name="calls_made"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Calls Made</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={entryForm.control}
                      name="clients_signed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clients Signed</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={entryForm.control}
                      name="cash_collected"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cash Collected ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                      name="closing_rate_target"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Closing Rate Target (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={configForm.control}
                      name="daily_units_target"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Daily Units Target</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={configForm.control}
                      name="daily_clients_target"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Daily Clients Target</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={configForm.control}
                      name="cash_per_call_target"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cash Per Call Target ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-6">
          <ConfirmedBookingsList />
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          {todayEntry ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todayEntry.units_sold}</div>
                  <Progress 
                    value={(todayEntry.units_sold / (config?.daily_units_target || 1)) * 100} 
                    className="mt-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Target: {config?.daily_units_target || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Closing Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{calculateClosingRate(todayEntry).toFixed(1)}%</div>
                  <Progress 
                    value={(calculateClosingRate(todayEntry) / (config?.closing_rate_target || 1)) * 100} 
                    className="mt-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Target: {config?.closing_rate_target || 0}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clients Signed</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todayEntry.clients_signed}</div>
                  <Progress 
                    value={(todayEntry.clients_signed / (config?.daily_clients_target || 1)) * 100} 
                    className="mt-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Target: {config?.daily_clients_target || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cash Per Call</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${calculateCashPerCall(todayEntry).toFixed(0)}</div>
                  <Progress 
                    value={(calculateCashPerCall(todayEntry) / (config?.cash_per_call_target || 1)) * 100} 
                    className="mt-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Target: ${config?.cash_per_call_target || 0}
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
                          {entry.units_sold} units • {entry.clients_signed} clients • ${entry.cash_collected}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {calculateClosingRate(entry).toFixed(1)}% close rate
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
                  <CardTitle>Sales Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="units_sold" stroke="hsl(var(--primary))" name="Units Sold" />
                      <Line type="monotone" dataKey="clients_signed" stroke="hsl(var(--secondary))" name="Clients Signed" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="closing_rate" fill="hsl(var(--primary))" name="Closing Rate %" />
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