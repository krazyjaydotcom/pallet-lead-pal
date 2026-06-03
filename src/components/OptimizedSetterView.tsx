import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { toast } from 'sonner';
import { Search, ExternalLink, PhoneCall, MessageSquare, CheckCircle, Target, TrendingUp, ChevronDown, ChevronRight, Trash2, RotateCcw, Ghost, Instagram, ChevronLeft, ChevronUp } from 'lucide-react';
import { Prospect } from './ProspectManager';
import { KPIEntry, SetterConfig } from './KPIDashboard';
import { FollowUpTicker } from './FollowUpTicker';
import { IGFollowerImporter } from './IGFollowerImporter';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface OptimizedSetterViewProps {
  kpiEntries: KPIEntry[];
  config: SetterConfig;
  onActivity: () => void;
}

const statusColors = {
  none: 'bg-slate-100 text-slate-800 border-slate-200',
  '1st contact': 'bg-blue-100 text-blue-800 border-blue-200',
  follow_up: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  training: 'bg-purple-100 text-purple-800 border-purple-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  no_response: 'bg-gray-100 text-gray-800 border-gray-200',
  ghost: 'bg-red-100 text-red-800 border-red-200',
};

const statusLabels = {
  none: 'New',
  '1st contact': '1st Contact',
  follow_up: 'Follow Up',
  training: 'Training',
  confirmed: 'Confirmed',
  no_response: 'No Response',
  ghost: 'Ghost',
};

export const OptimizedSetterView = ({ kpiEntries, config, onActivity }: OptimizedSetterViewProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [ghostProspects, setGhostProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProspectHandle, setNewProspectHandle] = useState('');
  const [ghostSectionOpen, setGhostSectionOpen] = useState(false);
  
  // IG Mode State
  const [igModeActive, setIgModeActive] = useState(false);
  const [activeProspect, setActiveProspect] = useState<Prospect | null>(null);
  const [igContextOpen, setIgContextOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadProspects();
    }
  }, [user]);

  const loadProspects = async () => {
    try {
      // Load active prospects
      const { data: activeData, error: activeError } = await supabase
        .from('prospects')
        .select('*')
        .not('status', 'in', '("ghost","no_response")')
        .order('created_at', { ascending: false })
        .limit(50);

      if (activeError) throw activeError;
      setProspects((activeData || []) as Prospect[]);

      // Load ghost prospects
      const { data: ghostData, error: ghostError } = await supabase
        .from('prospects')
        .select('*')
        .eq('status', 'ghost')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (ghostError) throw ghostError;
      setGhostProspects((ghostData || []) as Prospect[]);
    } catch (error) {
      console.error('Error loading prospects:', error);
      toast.error('Failed to load prospects');
    } finally {
      setLoading(false);
    }
  };

  const logProspectActivity = async (
    prospectId: string,
    eventType: 'touch_point' | 'call_pitched' | 'call_booked' | 'status_change' | 'follow_up_increment',
    metadata: Record<string, any> = {}
  ) => {
    try {
      if (!user) return;
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

        if (newFollowUpCount >= 5) {
          updates.status = 'ghost';
        }
      }

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
        await logProspectActivity(prospectId, 'touch_point', { reason: 'follow_up_increment' });
      } else {
        await logProspectActivity(prospectId, 'touch_point', { reason: 'status_change' });
      }
      
      if (updates.status === 'confirmed') {
        await logProspectActivity(prospectId, 'call_booked');
        await createConfirmedBooking(prospect);
      }

      await loadProspects();
      onActivity();
      toast.success('Status updated!');
    } catch (error) {
      console.error('Error updating prospect:', error);
      toast.error('Failed to update status');
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

  const quickPitch = async (prospect: Prospect) => {
    await logProspectActivity(prospect.id, 'call_pitched', { quick_action: true });
    await updateProspectStatus(prospect.id, '1st contact');
  };

  const quickBook = async (prospect: Prospect) => {
    await logProspectActivity(prospect.id, 'call_booked', { quick_action: true });
    await updateProspectStatus(prospect.id, 'confirmed');
  };

  const touchProspect = async (prospect: Prospect) => {
    const cleanHandle = prospect.ig_handle?.replace('@', '') || '';
    if (cleanHandle) {
      // Set active prospect for context
      setActiveProspect(prospect);
      
      // Open IG context if in IG mode
      if (igModeActive && isMobile) {
        setIgContextOpen(true);
      }
      
      // Safe Instagram opening without problematic iframe
      const igAppUrl = `instagram://user?username=${cleanHandle}`;
      const igWebUrl = `https://instagram.com/${cleanHandle}`;
      
      try {
        if (isMobile && navigator.userAgent.match(/iPhone|iPad|Android/)) {
          // Try app link directly, let the system handle it
          window.location.href = igAppUrl;
          // Fallback timeout in case app doesn't open
          setTimeout(() => {
            window.open(igWebUrl, '_blank', 'noopener,noreferrer');
          }, 1500);
        } else {
          window.open(igWebUrl, '_blank', 'noopener,noreferrer');
        }
      } catch (error) {
        window.open(igWebUrl, '_blank', 'noopener,noreferrer');
      }
      
      await logProspectActivity(prospect.id, 'touch_point', { channel: 'instagram', handle: cleanHandle });
      toast.success('Touch logged - IG opened');
    }
  };

  const addQuickProspect = async () => {
    if (!newProspectHandle.trim()) {
      toast.error('IG handle is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('prospects')
        .insert({
          user_id: user?.id,
          name: newProspectHandle.replace('@', ''),
          ig_handle: newProspectHandle.replace('@', ''),
          status: 'none',
          follow_up_count: 0,
        });

      if (error) throw error;
      
      setNewProspectHandle('');
      await loadProspects();
      toast.success('Prospect added!');
    } catch (error) {
      console.error('Error adding prospect:', error);
      toast.error('Failed to add prospect');
    }
  };

  const resurrectGhostProspect = async (prospectId: string) => {
    try {
      const { error } = await supabase
        .from('prospects')
        .update({ 
          status: 'follow_up',
          last_contact_date: new Date().toISOString()
        })
        .eq('id', prospectId);

      if (error) throw error;
      
      await loadProspects();
      onActivity();
      toast.success('Prospect resurrected!');
    } catch (error) {
      console.error('Error resurrecting prospect:', error);
      toast.error('Failed to resurrect prospect');
    }
  };

  const deleteGhostProspect = async (prospectId: string) => {
    try {
      const { error } = await supabase
        .from('prospects')
        .delete()
        .eq('id', prospectId);

      if (error) throw error;
      
      await loadProspects();
      toast.success('Ghost prospect deleted');
    } catch (error) {
      console.error('Error deleting prospect:', error);
      toast.error('Failed to delete prospect');
    }
  };

  const updateGhostNotes = async (prospectId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('prospects')
        .update({ notes })
        .eq('id', prospectId);

      if (error) throw error;
      
      await loadProspects();
      toast.success('Notes updated');
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Failed to update notes');
    }
  };

  // Calculate today's stats
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayEntry = kpiEntries.find(entry => entry.date?.slice(0,10) === todayKey);
  
  const touchPoints = todayEntry?.touch_points || 0;
  const callsPitched = todayEntry?.calls_pitched || 0;
  const callsBooked = todayEntry?.calls_booked || 0;
  const pitchToBookRatio = callsPitched > 0 ? (callsBooked / callsPitched) * 100 : 0;

  // Filter prospects
  const filteredProspects = searchTerm.trim() 
    ? prospects.filter(p => 
        p.ig_handle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : prospects;

  // Navigation functions for IG context
  const navigateProspect = (direction: 'prev' | 'next') => {
    if (!activeProspect) return;
    
    const currentIndex = filteredProspects.findIndex(p => p.id === activeProspect.id);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : filteredProspects.length - 1;
    } else {
      newIndex = currentIndex < filteredProspects.length - 1 ? currentIndex + 1 : 0;
    }
    
    const newProspect = filteredProspects[newIndex];
    if (newProspect) {
      touchProspect(newProspect);
    }
  };

  const toggleIgMode = () => {
    setIgModeActive(!igModeActive);
    if (!igModeActive) {
      toast.success('IG Mode activated - Touch prospects to open Instagram app');
    } else {
      setActiveProspect(null);
      setIgContextOpen(false);
      toast.success('IG Mode deactivated');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Compact Today's Stats Header */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Touch Points</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{touchPoints}</div>
              <Progress 
                value={(touchPoints / config.daily_touch_points_target) * 100}
                className="mt-1 h-2"
              />
              <div className="text-xs text-muted-foreground">of {config.daily_touch_points_target}</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Pitched</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{callsPitched}</div>
              <div className="text-xs text-muted-foreground">calls pitched today</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Booked</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{callsBooked}</div>
              <Progress 
                value={(callsBooked / config.daily_calls_booked_target) * 100}
                className="mt-1 h-2"
              />
              <div className="text-xs text-muted-foreground">of {config.daily_calls_booked_target}</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Ratio</span>
              </div>
              <div className={`text-2xl font-bold ${
                pitchToBookRatio >= config.pitch_to_book_ratio_target * 100 ? 'text-green-600' : 'text-red-600'
              }`}>
                {pitchToBookRatio.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">
                target: {(config.pitch_to_book_ratio_target * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Follow-up Ticker */}
      <FollowUpTicker />

      {/* Quick Actions Bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Input
            placeholder="@newhandle"
            value={newProspectHandle}
            onChange={(e) => setNewProspectHandle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addQuickProspect()}
            className="w-40"
          />
          <Button 
            size="sm" 
            onClick={addQuickProspect}
            disabled={!newProspectHandle.trim()}
          >
            Add Prospect
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prospects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-48"
          />
        </div>

        {/* IG Mode Toggle */}
        <Button 
          size="sm" 
          variant={igModeActive ? "default" : "outline"}
          onClick={toggleIgMode}
          className={`flex items-center gap-2 ${igModeActive ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
        >
          <Instagram className="h-4 w-4" />
          {igModeActive ? 'IG Mode ON' : 'IG Mode'}
        </Button>

        <IGFollowerImporter 
          onProspectAdd={async (data) => { 
            await loadProspects(); 
            onActivity(); 
          }} 
          existingProspects={prospects}
        />
      </div>

      {/* Streamlined Prospects Table - Compact in IG Mode */}
      <Card className={igModeActive && isMobile ? 'h-[40vh] overflow-hidden' : ''}>
        <CardContent className="p-0">
          <div className={igModeActive && isMobile ? 'overflow-y-auto h-full' : ''}>
            <Table>
              <TableHeader className={igModeActive && isMobile ? 'sticky top-0 bg-background z-10' : ''}>
                <TableRow>
                  <TableHead className="w-[200px]">Prospect</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  {!igModeActive && <TableHead className="w-[80px] text-center">Follow-ups</TableHead>}
                  <TableHead>Quick Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProspects.slice(0, igModeActive && isMobile ? 15 : 30).map((prospect) => (
                  <TableRow 
                    key={prospect.id} 
                    className={`hover:bg-muted/30 ${activeProspect?.id === prospect.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => touchProspect(prospect)}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                          title="Touch prospect on Instagram"
                        >
                          <span className="font-medium">@{prospect.ig_handle?.replace('@', '') || 'no-handle'}</span>
                          {igModeActive ? <Instagram className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                        </button>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Select
                        value={prospect.status}
                        onValueChange={(value) => updateProspectStatus(prospect.id, value as Prospect['status'])}
                      >
                        <SelectTrigger className={`${statusColors[prospect.status as keyof typeof statusColors]} h-8`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([status, label]) => (
                            <SelectItem key={status} value={status}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    
                    {!igModeActive && (
                      <TableCell className="text-center">
                        <Badge variant="outline" className="w-8 justify-center">
                          {prospect.follow_up_count}
                        </Badge>
                      </TableCell>
                    )}
                  
                    <TableCell>
                      <div className={`flex gap-1 ${igModeActive ? 'flex-col sm:flex-row' : ''}`}>
                        {prospect.status === 'none' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => quickPitch(prospect)}
                            className={`h-8 px-2 text-xs ${igModeActive ? 'w-full sm:w-auto' : ''}`}
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            {igModeActive ? 'Pitch' : 'Pitch'}
                          </Button>
                        )}
                        
                        {['none', '1st contact', 'follow_up'].includes(prospect.status) && (
                          <Button
                            size="sm"
                            onClick={() => quickBook(prospect)}
                            className={`h-8 px-2 text-xs bg-green-600 hover:bg-green-700 ${igModeActive ? 'w-full sm:w-auto' : ''}`}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Book
                          </Button>
                        )}
                        
                        {!['confirmed', 'ghost'].includes(prospect.status) && !igModeActive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateProspectStatus(prospect.id, 'follow_up', true)}
                            className="h-8 px-2 text-xs"
                          >
                            +1 Follow
                          </Button>
                        )}
                      </div>
                    </TableCell>
                </TableRow>
                  ))}
                
                {filteredProspects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={igModeActive ? 3 : 4} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? `No prospects found for "${searchTerm}"` : 'No active prospects. Add some to get started!'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {filteredProspects.length > (igModeActive && isMobile ? 15 : 30) && (
        <div className="text-center text-sm text-muted-foreground">
          Showing first {igModeActive && isMobile ? 15 : 30} prospects. Use search to find specific prospects.
        </div>
      )}

      {/* IG Context Floating Card - Mobile Only */}
      {igModeActive && isMobile && (
        <Drawer open={igContextOpen} onOpenChange={setIgContextOpen}>
          <DrawerContent className="h-[60vh]">
            <DrawerHeader className="border-b">
              <div className="flex items-center justify-between">
                <DrawerTitle className="flex items-center gap-2">
                  <Instagram className="h-5 w-5 text-blue-600" />
                  IG Context
                </DrawerTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIgContextOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
            </DrawerHeader>
            
            <div className="p-6 space-y-4">
              {activeProspect ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">@{activeProspect.ig_handle?.replace('@', '')}</h3>
                      <Badge className={statusColors[activeProspect.status as keyof typeof statusColors]}>
                        {statusLabels[activeProspect.status as keyof typeof statusLabels]}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Follow-ups: {activeProspect.follow_up_count || 0}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigateProspect('prev')}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <span className="text-sm text-muted-foreground">
                      {filteredProspects.findIndex(p => p.id === activeProspect.id) + 1} of {filteredProspects.length}
                    </span>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigateProspect('next')}
                      className="flex items-center gap-2"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {activeProspect.status === 'none' && (
                      <Button
                        onClick={() => quickPitch(activeProspect)}
                        className="w-full"
                        variant="outline"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Quick Pitch
                      </Button>
                    )}
                    
                    {['none', '1st contact', 'follow_up'].includes(activeProspect.status) && (
                      <Button
                        onClick={() => quickBook(activeProspect)}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Quick Book
                      </Button>
                    )}
                    
                    {!['confirmed', 'ghost'].includes(activeProspect.status) && (
                      <Button
                        onClick={() => updateProspectStatus(activeProspect.id, 'follow_up', true)}
                        className="w-full"
                        variant="secondary"
                      >
                        +1 Follow Up
                      </Button>
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground text-center">
                      Instagram app should be open. Switch back and forth to manage your conversations.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  Touch a prospect to see context here
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Floating IG Context Button - Shows when IG mode is active and prospect is selected */}
      {igModeActive && activeProspect && isMobile && !igContextOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIgContextOpen(true)}
            className="rounded-full h-14 w-14 shadow-lg bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <Instagram className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Ghost Prospects Section */}
      {ghostProspects.length > 0 && (
        <Card>
          <Collapsible open={ghostSectionOpen} onOpenChange={setGhostSectionOpen}>
            <CollapsibleTrigger className="w-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ghost className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Ghost Prospects</span>
                    <Badge variant="secondary">{ghostProspects.length}</Badge>
                  </div>
                  {ghostSectionOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="p-0 border-t">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">IG Handle</TableHead>
                      <TableHead className="w-[80px] text-center">Follow-ups</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ghostProspects.slice(0, 20).map((ghost) => (
                      <TableRow key={ghost.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const cleanHandle = ghost.ig_handle?.replace('@', '') || '';
                                if (cleanHandle) {
                                  const igUrl = `https://instagram.com/${cleanHandle}`;
                                  window.open(igUrl, '_blank', 'noopener,noreferrer');
                                }
                              }}
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                              title="View on Instagram"
                            >
                              <span className="font-medium">@{ghost.ig_handle?.replace('@', '') || 'no-handle'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-center">
                          <Badge variant="outline" className="w-8 justify-center bg-red-50 border-red-200">
                            {ghost.follow_up_count}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="max-w-xs">
                            <Input
                              placeholder="Add notes..."
                              defaultValue={ghost.notes || ''}
                              onBlur={(e) => {
                                if (e.target.value !== ghost.notes) {
                                  updateGhostNotes(ghost.id, e.target.value);
                                }
                              }}
                              className="h-8 text-xs"
                            />
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resurrectGhostProspect(ghost.id)}
                              className="h-8 px-2 text-xs text-green-600 hover:text-green-700"
                              title="Resurrect prospect"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteGhostProspect(ghost.id)}
                              className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
                              title="Delete prospect"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {ghostProspects.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No ghost prospects found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  );
};