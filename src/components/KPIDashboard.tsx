import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


import { ShareLinkDialog } from "@/components/ShareLinkDialog";
import { OptimizedSetterView } from "@/components/OptimizedSetterView";
import { toast } from "sonner";

export interface KPIEntry {
  id: string;
  user_id: string;
  date: string;
  touch_points: number;
  calls_pitched: number;
  calls_booked: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SetterConfig {
  id: string;
  user_id: string;
  daily_touch_points_target: number;
  pitch_to_book_ratio_target: number;
  daily_calls_booked_target: number;
  created_at: string;
  updated_at: string;
}

export const KPIDashboard = () => {
  const { user } = useAuth();
  const [kpiEntries, setKpiEntries] = useState<KPIEntry[]>([]);
  const [config, setConfig] = useState<SetterConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load KPI entries saved manually (legacy)
      const { data: manualEntries, error: entriesError } = await supabase
        .from('setter_kpi_entries')
        .select('*')
        .eq('user_id', user.id);

      if (entriesError) throw entriesError;

      // Load auto-tracked prospect activity (last 90 days) and aggregate to KPI-style rows
      const since = new Date();
      since.setDate(since.getDate() - 90);

      const { data: activity, error: activityError } = await (supabase as any)
        .from('prospect_activity')
        .select('event_type, created_at, prospect_id')
        .eq('user_id', user.id)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

      if (activityError) throw activityError;

      // Deduplicate by prospect per day per event type
      type Dedupe = { touch_point: Set<string>; call_pitched: Set<string>; call_booked: Set<string> };
      const daily: Record<string, Dedupe> = {};
      const toDateKey = (iso: string) => (iso as string).slice(0, 10);

      (activity || []).forEach((a: any) => {
        const key = toDateKey(a.created_at as string);
        if (!daily[key]) daily[key] = { touch_point: new Set(), call_pitched: new Set(), call_booked: new Set() };
        const pid = String(a.prospect_id || '');
        if (!pid) return;
        if (a.event_type === 'touch_point') daily[key].touch_point.add(pid);
        else if (a.event_type === 'call_pitched') daily[key].call_pitched.add(pid);
        else if (a.event_type === 'call_booked') daily[key].call_booked.add(pid);
      });

      type Counts = { touch_points: number; calls_pitched: number; calls_booked: number };
      const aggMap: Record<string, Counts> = {};
      Object.entries(daily).forEach(([date, sets]) => {
        aggMap[date] = {
          touch_points: sets.touch_point.size,
          calls_pitched: sets.call_pitched.size,
          calls_booked: sets.call_booked.size,
        };
      });

      // Combine manual entries with aggregated activity by date
      const combined: Record<string, KPIEntry> = {};
      const manualEntryDates = new Set<string>();
      
      // First, add all manual KPI entries (these come from database trigger)
      (manualEntries || []).forEach((e: any) => {
        manualEntryDates.add(e.date);
        combined[e.date] = {
          id: e.id,
          user_id: e.user_id,
          date: e.date,
          touch_points: e.touch_points,
          calls_pitched: e.calls_pitched,
          calls_booked: e.calls_booked,
          notes: e.notes ?? undefined,
          created_at: e.created_at,
          updated_at: e.updated_at,
        } as KPIEntry;
      });

      // Only add aggregated activity for dates that DON'T have manual entries
      // This prevents double-counting when database trigger has already created entries
      Object.entries(aggMap).forEach(([date, counts]) => {
        if (!manualEntryDates.has(date)) {
          combined[date] = {
            id: `agg-${date}`,
            user_id: user.id,
            date,
            touch_points: counts.touch_points,
            calls_pitched: counts.calls_pitched,
            calls_booked: counts.calls_booked,
            created_at: `${date}T00:00:00.000Z`,
            updated_at: new Date().toISOString(),
          } as KPIEntry;
        }
      });

      const mergedEntries = Object.values(combined).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setKpiEntries(mergedEntries);

      // Load or create config
      const { data: configData, error: configError } = await supabase
        .from('setter_config')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }

      if (!configData) {
        // Create default config
        const { data: newConfig, error: createError } = await supabase
          .from('setter_config')
          .insert({
            user_id: user.id,
            daily_touch_points_target: 100,
            pitch_to_book_ratio_target: 0.50,
            daily_calls_booked_target: 5
          })
          .select()
          .single();

        if (createError) throw createError;
        setConfig(newConfig);
      } else {
        setConfig(configData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load KPI data');
    } finally {
      setLoading(false);
    }
  };


  const handleEntryDelete = (entryId: string) => {
    if (entryId.startsWith('agg-')) {
      // For aggregated entries, remove all entries for that date
      const dateStr = entryId.slice(4);
      setKpiEntries(prev => prev.filter(entry => entry.date.slice(0, 10) !== dateStr));
    } else {
      // For individual entries, remove by ID
      setKpiEntries(prev => prev.filter(entry => entry.id !== entryId));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">Loading KPI dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Instagram DM Setter KPI Tracker</h2>
          <p className="text-muted-foreground">
            Track your daily performance and visualize your progress towards booking goals
          </p>
        </div>
        <ShareLinkDialog kpiType="setter" />
      </div>

      {config && (
        <OptimizedSetterView 
          kpiEntries={kpiEntries} 
          config={config}
          onActivity={loadData}
        />
      )}
    </div>
  );
};