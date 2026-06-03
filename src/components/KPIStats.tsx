import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, TrendingUp, TrendingDown, Target, Trash2 } from "lucide-react";
import { format, isToday } from "date-fns";
import { KPIEntry, SetterConfig } from "@/components/KPIDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface KPIStatsProps {
  kpiEntries: KPIEntry[];
  config: SetterConfig;
  onConfigUpdate: (config: SetterConfig) => void;
  onEntryDelete: (entryId: string) => void;
  onRefresh: () => Promise<void> | void;
}

export const KPIStats = ({ kpiEntries, config, onConfigUpdate, onEntryDelete, onRefresh }: KPIStatsProps) => {
  const { user } = useAuth();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    daily_touch_points_target: config.daily_touch_points_target.toString(),
    pitch_to_book_ratio_target: (config.pitch_to_book_ratio_target * 100).toString(),
    daily_calls_booked_target: config.daily_calls_booked_target.toString()
  });

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayEntry = kpiEntries.find(entry => entry.date?.slice(0,10) === todayKey);
  
  const calculateRatio = (numerator: number, denominator: number) => {
    return denominator > 0 ? (numerator / denominator) * 100 : 0;
  };

  const touchPointToPitchRatio = todayEntry 
    ? calculateRatio(todayEntry.calls_pitched, todayEntry.touch_points)
    : 0;

  const pitchToBookRatio = todayEntry
    ? calculateRatio(todayEntry.calls_booked, todayEntry.calls_pitched)
    : 0;

  const handleConfigSave = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('setter_config')
        .update({
          daily_touch_points_target: parseInt(configForm.daily_touch_points_target),
          pitch_to_book_ratio_target: parseFloat(configForm.pitch_to_book_ratio_target) / 100,
          daily_calls_booked_target: parseInt(configForm.daily_calls_booked_target)
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      onConfigUpdate(data);
      setIsConfigOpen(false);
      toast.success('Configuration updated successfully');
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Failed to update configuration');
    }
  };

  const getPerformanceColor = (value: number, target: number, isRatio: boolean = false) => {
    const threshold = isRatio ? target * 0.8 : target * 0.8;
    if (value >= target) return "text-green-600";
    if (value >= threshold) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (value: number, target: number) => {
    const percentage = (value / target) * 100;
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;

    const isUuid = /^[0-9a-fA-F-]{36}$/.test(entryId);
    const entry = kpiEntries.find(e => e.id === entryId);
    const dateStr = entryId.startsWith('agg-') ? entryId.slice(4) : (entry?.date?.slice(0, 10) || '');

    try {
      if (isUuid) {
        const { error } = await supabase
          .from('setter_kpi_entries')
          .delete()
          .eq('id', entryId)
          .eq('user_id', user.id);
        if (error) throw error;
        onEntryDelete(entryId);
        await onRefresh?.();
        toast.success('KPI entry deleted');
      } else if (dateStr) {
        const ok = window.confirm(`Delete aggregated data for ${dateStr}? This will clear touch points and calls booked for that day.`);
        if (!ok) return;

        const [delManual, delActivity] = await Promise.all([
          supabase.from('setter_kpi_entries').delete().eq('user_id', user.id).eq('date', dateStr),
          (supabase as any)
            .from('prospect_activity')
            .delete()
            .eq('user_id', user.id)
            .eq('event_date', dateStr)
            .in('event_type', ['touch_point', 'follow_up_increment', 'call_booked'])
        ]);
        if (delManual.error) throw delManual.error;
        if (delActivity.error) throw delActivity.error;
        await onRefresh?.();
        toast.success('Day deleted');
      } else {
        toast.error('Could not determine entry date');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete');
    }
  };

  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Today's Performance</h3>
        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Configure Targets
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure Targets</DialogTitle>
              <DialogDescription>
                Set your daily targets and performance benchmarks
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="touchPointsTarget">Daily Touch Points Target</Label>
                <Input
                  id="touchPointsTarget"
                  type="number"
                  value={configForm.daily_touch_points_target}
                  onChange={(e) => setConfigForm(prev => ({
                    ...prev,
                    daily_touch_points_target: e.target.value
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ratioTarget">Pitch to Book Ratio Target (%)</Label>
                <Input
                  id="ratioTarget"
                  type="number"
                  value={configForm.pitch_to_book_ratio_target}
                  onChange={(e) => setConfigForm(prev => ({
                    ...prev,
                    pitch_to_book_ratio_target: e.target.value
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="callsTarget">Daily Calls Booked Target</Label>
                <Input
                  id="callsTarget"
                  type="number"
                  value={configForm.daily_calls_booked_target}
                  onChange={(e) => setConfigForm(prev => ({
                    ...prev,
                    daily_calls_booked_target: e.target.value
                  }))}
                />
              </div>
              <Button onClick={handleConfigSave} className="w-full">
                Save Configuration
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!todayEntry && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-center text-yellow-800">
              No data entered for today. Add your daily KPI entry to see performance metrics.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Touch Points</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayEntry?.touch_points || 0}
            </div>
            <Progress 
              value={todayEntry ? (todayEntry.touch_points / config.daily_touch_points_target) * 100 : 0}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Target: {config.daily_touch_points_target}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Pitched</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayEntry?.calls_pitched || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Touch Point to Pitch: {touchPointToPitchRatio.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Booked</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayEntry?.calls_booked || 0}
            </div>
            <Progress 
              value={todayEntry ? (todayEntry.calls_booked / config.daily_calls_booked_target) * 100 : 0}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Target: {config.daily_calls_booked_target}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pitch to Book Ratio</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(pitchToBookRatio, config.pitch_to_book_ratio_target * 100, true)}`}>
              {pitchToBookRatio.toFixed(1)}%
            </div>
            <Badge 
              variant={pitchToBookRatio >= config.pitch_to_book_ratio_target * 100 ? "default" : "destructive"}
              className="mt-2"
            >
              Target: {(config.pitch_to_book_ratio_target * 100).toFixed(0)}%
            </Badge>
          </CardContent>
        </Card>
      </div>

      {todayEntry?.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{todayEntry.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Entries</CardTitle>
          <CardDescription>Your last 7 KPI entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {kpiEntries.slice(0, 7).map((entry) => (
              <div key={entry.id} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{format(new Date(entry.date + 'T00:00:00'), 'MMM dd, yyyy')}</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.touch_points} touches → {entry.calls_pitched} pitched → {entry.calls_booked} booked
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {calculateRatio(entry.calls_booked, entry.calls_pitched).toFixed(1)}%
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-destructive hover:text-destructive"
                    title="Delete this day"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {kpiEntries.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No KPI entries yet. Start by adding your first entry!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};