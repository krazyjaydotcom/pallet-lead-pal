import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'setter' | 'closer' | 'csm' | 'business' | 'hybrid';
export type BusinessContext = 'academy' | 'crm' | 'hybrid';

interface RoleActivity {
  hasSetterData: boolean;
  hasCloserData: boolean;
  hasCsmData: boolean;
  hasBusinessData: boolean;
  setterActivity: number;
  closerActivity: number;
  csmActivity: number;
  businessActivity: number;
  academyActivity: number;
  crmActivity: number;
}

export const useUserRole = () => {
  const { user } = useAuth();
  const [primaryRole, setPrimaryRole] = useState<UserRole | null>(null);
  const [primaryBusiness, setPrimaryBusiness] = useState<BusinessContext | null>(null);
  const [roleActivity, setRoleActivity] = useState<RoleActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      detectUserRole();
    }
  }, [user]);

  const detectUserRole = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Check for activity in each area
      const [setterKpi, closerKpi, csmKpi, leads, prospects] = await Promise.all([
        supabase.from('setter_kpi_entries').select('id').eq('user_id', user.id).limit(1),
        supabase.from('closer_kpi_entries').select('id').eq('user_id', user.id).limit(1),
        supabase.from('csm_kpi_entries').select('id').eq('user_id', user.id).limit(1),
        supabase.from('leads').select('id').eq('user_id', user.id).limit(1),
        supabase.from('prospects').select('id').eq('user_id', user.id).limit(1)
      ]);

      // Count recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [setterRecent, closerRecent, csmRecent, leadsRecent, prospectsRecent] = await Promise.all([
        supabase.from('setter_kpi_entries').select('id').eq('user_id', user.id).gte('date', thirtyDaysAgo.toISOString().split('T')[0]),
        supabase.from('closer_kpi_entries').select('id').eq('user_id', user.id).gte('date', thirtyDaysAgo.toISOString().split('T')[0]),
        supabase.from('csm_kpi_entries').select('id').eq('user_id', user.id).gte('date', thirtyDaysAgo.toISOString().split('T')[0]),
        supabase.from('leads').select('id').eq('user_id', user.id).gte('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('prospects').select('id').eq('user_id', user.id).gte('created_at', thirtyDaysAgo.toISOString())
      ]);

      const activity: RoleActivity = {
        hasSetterData: (setterKpi.data?.length || 0) > 0 || (prospects.data?.length || 0) > 0,
        hasCloserData: (closerKpi.data?.length || 0) > 0,
        hasCsmData: (csmKpi.data?.length || 0) > 0,
        hasBusinessData: (leads.data?.length || 0) > 0,
        setterActivity: (setterRecent.data?.length || 0) + (prospectsRecent.data?.length || 0),
        closerActivity: closerRecent.data?.length || 0,
        csmActivity: csmRecent.data?.length || 0,
        businessActivity: leadsRecent.data?.length || 0,
        academyActivity: (setterRecent.data?.length || 0) + (prospectsRecent.data?.length || 0) + (closerRecent.data?.length || 0) + (csmRecent.data?.length || 0),
        crmActivity: leadsRecent.data?.length || 0
      };

      setRoleActivity(activity);

      // Determine primary business context
      if (activity.academyActivity > activity.crmActivity) {
        setPrimaryBusiness('academy');
      } else if (activity.crmActivity > activity.academyActivity) {
        setPrimaryBusiness('crm');
      } else if (activity.academyActivity > 0 && activity.crmActivity > 0) {
        setPrimaryBusiness('hybrid');
      } else {
        // Default to academy if no activity (since it's the main platform)
        setPrimaryBusiness('academy');
      }

      // Determine primary role based on activity
      const roleScores = {
        setter: activity.setterActivity,
        closer: activity.closerActivity,
        csm: activity.csmActivity,
        business: activity.businessActivity
      };

      const activeRoles = Object.entries(roleScores).filter(([_, score]) => score > 0);
      
      if (activeRoles.length === 0) {
        // No activity detected, default to setter
        setPrimaryRole('setter');
      } else if (activeRoles.length === 1) {
        setPrimaryRole(activeRoles[0][0] as UserRole);
      } else {
        // Multiple roles, pick the most active one
        const mostActive = Object.entries(roleScores).reduce((a, b) => 
          roleScores[a[0] as keyof typeof roleScores] > roleScores[b[0] as keyof typeof roleScores] ? a : b
        );
        setPrimaryRole(mostActive[0] as UserRole);
      }

    } catch (error) {
      console.error('Error detecting user role:', error);
      setPrimaryRole('setter'); // Default fallback
    } finally {
      setLoading(false);
    }
  };

  return {
    primaryRole,
    primaryBusiness,
    roleActivity,
    loading,
    refreshRole: detectUserRole
  };
};