import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface OverdueProspect {
  id: string;
  name: string;
  ig_handle: string;
  last_contact_date: string;
  hoursOverdue: number;
}

export const FollowUpTicker = () => {
  const { user } = useAuth();
  const [overdueProspects, setOverdueProspects] = useState<OverdueProspect[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (user) {
      loadOverdueProspects();
      // Refresh every 5 minutes
      const interval = setInterval(loadOverdueProspects, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (overdueProspects.length > 1) {
      // Cycle through prospects every 4 seconds
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % overdueProspects.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [overdueProspects.length]);

  const loadOverdueProspects = async () => {
    if (!user) return;

    try {
      // Get prospects that have been tagged for first followup (follow_up_count > 0)
      // and haven't been contacted in the last 20 hours
      const twentyHoursAgo = new Date();
      twentyHoursAgo.setHours(twentyHoursAgo.getHours() - 20);

      const { data: prospects, error } = await supabase
        .from('prospects')
        .select('id, name, ig_handle, last_contact_date, follow_up_count')
        .eq('user_id', user.id)
        .gt('follow_up_count', 0) // Only prospects that have been tagged for followup
        .lt('last_contact_date', twentyHoursAgo.toISOString())
        .neq('status', 'ghost') // Exclude ghosts
        .neq('status', 'confirmed') // Exclude confirmed
        .order('last_contact_date', { ascending: true });

      if (error) throw error;

      const overdue = prospects?.map(prospect => {
        const lastContact = new Date(prospect.last_contact_date);
        const now = new Date();
        const hoursDiff = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60));
        
        return {
          id: prospect.id,
          name: prospect.name,
          ig_handle: prospect.ig_handle || '',
          last_contact_date: prospect.last_contact_date,
          hoursOverdue: hoursDiff
        };
      }) || [];

      setOverdueProspects(overdue);
    } catch (error) {
      console.error('Error loading overdue prospects:', error);
    }
  };

  if (overdueProspects.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-center gap-2 text-green-700">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">All prospects up to date! 🎉</span>
        </div>
      </div>
    );
  }

  const currentProspect = overdueProspects[currentIndex];
  const getUrgencyLevel = (hours: number) => {
    if (hours >= 48) return { level: 'critical', color: 'bg-red-100 border-red-300 text-red-800' };
    if (hours >= 30) return { level: 'high', color: 'bg-orange-100 border-orange-300 text-orange-800' };
    return { level: 'medium', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' };
  };

  const urgency = getUrgencyLevel(currentProspect.hoursOverdue);

  return (
    <div className={`border rounded-lg p-3 mb-4 ${urgency.color} transition-all duration-500`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-4 h-4 animate-pulse" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                Follow-up needed: {currentProspect.name}
              </span>
              {currentProspect.ig_handle && (
                <Badge variant="outline" className="text-xs">
                  @{currentProspect.ig_handle}
                </Badge>
              )}
            </div>
            <div className="text-xs opacity-75">
              Last contact: {currentProspect.hoursOverdue}h ago
            </div>
          </div>
        </div>
        
        {overdueProspects.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-75">
              {currentIndex + 1} of {overdueProspects.length}
            </span>
            <div className="flex gap-1">
              {overdueProspects.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                    index === currentIndex ? 'bg-current' : 'bg-current/30'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};