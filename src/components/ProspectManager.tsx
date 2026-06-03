
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ProspectSpreadsheet } from './ProspectSpreadsheet';
import { TrainingReminderList } from './TrainingReminderList';
import { IGFollowerImporter } from './IGFollowerImporter';
import { FollowUpTicker } from './FollowUpTicker';

export interface Prospect {
  id: string;
  user_id: string;
  name: string;
  ig_handle?: string;
  phone?: string;
  email?: string;
  status: 'none' | '1st contact' | 'follow_up' | 'training' | 'confirmed' | 'no_response' | 'ghost';
  follow_up_count: number;
  notes?: string;
  training_reminder_date?: string;
  created_at: string;
  updated_at: string;
  last_contact_date?: string;
}

export const ProspectManager = ({ onActivity }: { onActivity?: () => void }) => {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    if (user) {
      loadProspects();
    }
  }, [user]);

  const loadProspects = async () => {
    try {
      console.log('ProspectManager: Loading prospects for user:', user?.id);
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('ProspectManager: Error loading prospects:', error);
        throw error;
      }
      
      console.log('ProspectManager: Loaded prospects:', data);
      setProspects((data || []) as Prospect[]);
    } catch (error) {
      console.error('Error loading prospects:', error);
      toast.error('Failed to load prospects');
    } finally {
      setLoading(false);
    }
  };

  const logProspectActivity = async (
    prospectId: string,
    eventType: 'touch_point' | 'call_pitched' | 'call_booked' | 'status_change' | 'note_added' | 'follow_up_increment',
    metadata: Record<string, any> = {}
  ) => {
    try {
      if (!user) {
        console.error('ProspectManager: No user found for activity logging');
        return;
      }
      
      console.log('ProspectManager: Logging activity:', { prospectId, eventType, metadata });
      await (supabase as any).from('prospect_activity').insert({
        user_id: user.id,
        prospect_id: prospectId,
        event_type: eventType,
        metadata,
      });
    } catch (e) {
      console.error('Failed to log prospect activity:', e);
    }
  };

  const handleLogActivity = async (
    prospectId: string,
    eventType: 'touch_point' | 'call_pitched' | 'call_booked' | 'status_change' | 'note_added' | 'follow_up_increment',
    metadata: Record<string, any> = {}
  ) => {
    await logProspectActivity(prospectId, eventType, metadata);
    onActivity?.();
  };

  const addProspect = async (prospectData: any) => {
    try {
      if (!user) {
        console.error('ProspectManager: No user found for adding prospect');
        toast.error('User not authenticated');
        return;
      }

      console.log('ProspectManager: Adding prospect with data:', prospectData);

      // Generate a unique ID for the prospect
      const prospectId = crypto.randomUUID();

      const newProspect = {
        id: prospectId,
        user_id: user.id,
        name: prospectData.name,
        ig_handle: prospectData.ig_handle || null,
        phone: prospectData.phone || null,
        email: prospectData.email || null,
        status: prospectData.status || 'none',
        follow_up_count: prospectData.follow_up_count || 0,
        notes: prospectData.notes || null,
        last_contact_date: prospectData.last_contact_date || new Date().toISOString(),
      };

      console.log('ProspectManager: Inserting prospect:', newProspect);

      const { data, error } = await supabase
        .from('prospects')
        .insert([newProspect])
        .select()
        .single();

      if (error) {
        console.error('ProspectManager: Database error:', error);
        throw error;
      }

      console.log('ProspectManager: Successfully added prospect:', data);
      
      // Refresh the prospects list
      await loadProspects();
      
      toast.success('Prospect added successfully!');
      onActivity?.();
      
      return data;
    } catch (error) {
      console.error('ProspectManager: Error adding prospect:', error);
      toast.error('Failed to add prospect: ' + (error as Error).message);
      throw error;
    }
  };

  const updateProspectStatus = async (prospectId: string, newStatus: Prospect['status'], followUpIncrement = false) => {
    try {
      const prospect = prospects.find(p => p.id === prospectId);
      if (!prospect) return;

      const increment = followUpIncrement || newStatus === 'follow_up';

      let updates: any = {
        status: newStatus,
        last_contact_date: new Date().toISOString(),
      };

      if (increment) {
        const newFollowUpCount = (prospect.follow_up_count || 0) + 1;
        updates.follow_up_count = newFollowUpCount;

        // Auto-move to ghost if reached maximum follow-ups (5)
        if (newFollowUpCount >= 5) {
          updates.status = 'ghost';
          toast.info(`${prospect.name} automatically moved to ghost prospects (max follow-ups reached)`);
        }
      }

      // Set training reminder for 24 hours
      if (updates.status === 'training') {
        const reminderDate = new Date();
        reminderDate.setHours(reminderDate.getHours() + 24);
        updates.training_reminder_date = reminderDate.toISOString();
      }

      const { error } = await supabase
        .from('prospects')
        .update(updates)
        .eq('id', prospectId);

      if (error) throw error;

      // Log activities
      await logProspectActivity(prospectId, 'status_change', { from: prospect.status, to: updates.status });
      if (increment) {
        await logProspectActivity(prospectId, 'follow_up_increment', { count: updates.follow_up_count ?? (prospect.follow_up_count + 1) });
        await logProspectActivity(prospectId, 'touch_point', { reason: 'follow_up_increment', count: updates.follow_up_count ?? (prospect.follow_up_count + 1) });
      } else {
        await logProspectActivity(prospectId, 'touch_point', { reason: 'status_change', to: updates.status });
      }
      if (updates.status === 'confirmed') {
        await logProspectActivity(prospectId, 'call_booked');
        await createConfirmedBooking(prospect);
      }

      await loadProspects();
      onActivity?.();

      if (updates.status === 'ghost' && increment && (prospect.follow_up_count + 1) >= 5) {
        // Special message for auto-ghost
        toast.success('Prospect automatically moved to ghost section');
      } else {
        toast.success('Prospect status updated');
      }
    } catch (error) {
      console.error('Error updating prospect:', error);
      toast.error('Failed to update prospect status');
    }
  };
  
  const createConfirmedBooking = async (prospect: Prospect) => {
    try {
      const { error } = await supabase
        .from('confirmed_bookings')
        .insert({
          prospect_id: prospect.id,
          setter_user_id: user?.id,
          name: prospect.name,
          ig_handle: prospect.ig_handle,
          phone: prospect.phone,
          email: prospect.email,
          notes: prospect.notes,
        });

      if (error) throw error;
      toast.success('Booking confirmed and sent to closers!');
    } catch (error) {
      console.error('Error creating confirmed booking:', error);
      toast.error('Failed to create confirmed booking');
    }
  };


  if (loading) {
    return <div>Loading prospects...</div>;
  }

  const activeProspects = prospects.filter(p => !['confirmed', 'ghost', 'no_response'].includes(p.status));
  const ghostProspects = prospects.filter(p => ['ghost', 'no_response'].includes(p.status));
  const trainingProspects = prospects.filter(p => p.status === 'training');
  const confirmedProspects = prospects.filter(p => p.status === 'confirmed');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Prospect Management</h2>
        <IGFollowerImporter onProspectAdd={addProspect} existingProspects={prospects} />
      </div>

      <FollowUpTicker />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{activeProspects.length}</div>
            <div className="text-sm text-muted-foreground">Active Prospects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{trainingProspects.length}</div>
            <div className="text-sm text-muted-foreground">Training List</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{confirmedProspects.length}</div>
            <div className="text-sm text-muted-foreground">Confirmed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{ghostProspects.length}</div>
            <div className="text-sm text-muted-foreground">Ghost Prospects</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Prospects</TabsTrigger>
          <TabsTrigger value="training">Training List</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="ghost">Ghost Prospects</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <ProspectSpreadsheet
            prospects={activeProspects}
            onUpdateStatus={updateProspectStatus}
            onRefresh={loadProspects}
            onLogActivity={handleLogActivity}
          />
        </TabsContent>

        <TabsContent value="training">
          <TrainingReminderList
            prospects={trainingProspects}
            onUpdateStatus={updateProspectStatus}
          />
        </TabsContent>

        <TabsContent value="confirmed">
          <ProspectSpreadsheet
            prospects={confirmedProspects}
            onUpdateStatus={updateProspectStatus}
            onRefresh={loadProspects}
            onLogActivity={handleLogActivity}
          />
        </TabsContent>

        <TabsContent value="ghost">
          <ProspectSpreadsheet
            prospects={ghostProspects}
            onUpdateStatus={updateProspectStatus}
            onRefresh={loadProspects}
            onLogActivity={handleLogActivity}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
