import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, Calendar as CalendarIcon, Clock, User, Plus, CheckCircle, UserPlus, Users, ChevronDown, ChevronUp, Trash2, UserX } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { z } from 'zod';
import { formatPhoneNumber } from "@/utils/phoneFormat";
import { ProspectAnalytics } from './ProspectAnalytics';
import { CallManagementDialog } from './CallManagementDialog';

interface ConfirmedBooking {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  ig_handle?: string;
  notes?: string;
  status: string;
  created_at: string;
  last_contact_date?: string;
  next_follow_up_date?: string;
  follow_up_sequence?: number;
  follow_up_notes?: string[];
  auto_follow_up_enabled?: boolean;
}

const newClientSchema = z.object({
  name: z.string().trim().nonempty({ message: "Name is required" }).max(100),
  email: z.string().trim().email({ message: "Invalid email" }).max(255).optional(),
  phone: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const CustomerFollowUp = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<ConfirmedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<ConfirmedBooking | null>(null);
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [nextCallDate, setNextCallDate] = useState<Date>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // New client form state
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientNotes, setNewClientNotes] = useState("");
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [callManagementBooking, setCallManagementBooking] = useState<ConfirmedBooking | null>(null);
  const [showCallManagement, setShowCallManagement] = useState(false);
  const [deleteConfirmBooking, setDeleteConfirmBooking] = useState<ConfirmedBooking | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('confirmed_bookings')
        .select('*')
        .or(`setter_user_id.eq.${user?.id},closer_user_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load customer bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const recordFollowUp = async (bookingId: string, notes: string, nextCall?: Date) => {
    try {
      const currentBooking = bookings.find(b => b.id === bookingId);
      if (!currentBooking) return;

      // Create the new follow-up note entry
      const existingNotes = currentBooking.follow_up_notes || [];
      const newFollowUpNotes = [...existingNotes, notes];
      
      // Increment the follow-up sequence
      const newSequence = (currentBooking.follow_up_sequence || 0) + 1;

      const updates: any = {
        follow_up_notes: newFollowUpNotes,
        last_contact_date: new Date().toISOString(),
        follow_up_sequence: newSequence,
      };

      // If manual next call date is specified, use it and disable auto follow-up
      if (nextCall) {
        updates.next_follow_up_date = nextCall.toISOString();
        updates.auto_follow_up_enabled = false;
      }
      // Otherwise, let the trigger handle automatic scheduling

      const { error } = await supabase
        .from('confirmed_bookings')
        .update(updates)
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Follow-up Recorded",
        description: `Follow-up #${newSequence} recorded successfully`,
      });

      loadBookings();
      setIsDialogOpen(false);
      setFollowUpNotes("");
      setNextCallDate(undefined);
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error recording follow-up:', error);
      toast({
        title: "Error",
        description: "Failed to record follow-up",
        variant: "destructive",
      });
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    console.log('Updating booking status:', { bookingId, status });
    try {
      const { error } = await supabase
        .from('confirmed_bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast({
        title: "Status Updated",
        description: `Customer status updated to ${status}`,
      });

      loadBookings();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const deleteBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('confirmed_bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Customer Deleted",
        description: "Customer has been permanently removed from your bookings",
      });

      loadBookings();
      setShowDeleteConfirm(false);
      setDeleteConfirmBooking(null);
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    }
  };

  const markAsNoCallNoShow = async (booking: ConfirmedBooking) => {
    try {
      // Insert into no_call_no_shows table
      const { error: noShowError } = await supabase
        .from('no_call_no_shows')
        .insert({
          user_id: user?.id,
          first_name: booking.name.split(' ')[0] || booking.name,
          last_name: booking.name.split(' ').slice(1).join(' ') || '',
          email: booking.email || null,
          phone: booking.phone || null,
          notes: `No call/no show from booking on ${format(new Date(booking.created_at), "MMM d, yyyy")}`,
          date: new Date().toISOString().split('T')[0] // Today's date
        });

      if (noShowError) throw noShowError;

      // Update booking status to indicate no show
      const { error: updateError } = await supabase
        .from('confirmed_bookings')
        .update({ 
          status: 'not_interested',
          follow_up_notes: [...(booking.follow_up_notes || []), `Marked as no call/no show on ${format(new Date(), "MMM d, yyyy")}`]
        })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      toast({
        title: "Marked as No Call/No Show",
        description: `${booking.name} has been recorded as a no call/no show`,
      });

      loadBookings();
    } catch (error) {
      console.error('Error marking as no call/no show:', error);
      toast({
        title: "Error",
        description: "Failed to mark as no call/no show",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'contacted': return 'bg-blue-100 text-blue-800';
      case 'follow_up_scheduled': return 'bg-purple-100 text-purple-800';
      case 'ready_to_proceed': return 'bg-emerald-100 text-emerald-800';
      case 'closed': return 'bg-green-100 text-green-800';
      case 'not_interested': return 'bg-red-100 text-red-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'contacted': return 'Contacted';
      case 'follow_up_scheduled': return 'Scheduled';
      case 'ready_to_proceed': return 'Ready to Proceed';
      case 'closed': return 'Closed Won';
      case 'not_interested': return 'Not Interested';
      case 'lost': return 'Lost';
      default: return status;
    }
  };

  const isCallDue = (nextFollowUpDate?: string) => {
    if (!nextFollowUpDate) return false;
    return new Date(nextFollowUpDate) <= new Date();
  };

  const addNewClient = async () => {
    if (!newClientName.trim()) return;
    
    // Validate inputs (client-side)
    const payload = {
      name: newClientName,
      email: newClientEmail || undefined,
      phone: newClientPhone || undefined,
      notes: newClientNotes || undefined,
    };
    const parsed = newClientSchema.safeParse(payload);
    if (!parsed.success) {
      toast({
        title: "Validation Error",
        description: parsed.error.errors[0]?.message || "Please check your inputs",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingClient(true);
      
      // First, create a prospect record with a valid status per DB constraint
      const { data: prospectData, error: prospectError } = await supabase
        .from('prospects')
        .insert({
          name: parsed.data.name,
          email: parsed.data.email || null,
          phone: parsed.data.phone || null,
          notes: parsed.data.notes || null,
          user_id: user?.id,
          status: '1st contact'
        })
        .select()
        .single();

      if (prospectError) throw prospectError;

      // Then, create the confirmed booking with the prospect ID
      const { error } = await supabase
        .from('confirmed_bookings')
        .insert({
          name: parsed.data.name,
          email: parsed.data.email || null,
          phone: parsed.data.phone || null,
          notes: parsed.data.notes || null,
          setter_user_id: user?.id,
          prospect_id: prospectData.id,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Client Added",
        description: `${parsed.data.name} has been added to your follow-up list`,
      });

      // Reset form
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      setNewClientNotes("");
      
      loadBookings();
    } catch (error) {
      console.error('Error adding client:', error);
      toast({
        title: "Error",
        description: "Failed to add client",
        variant: "destructive",
      });
    } finally {
      setIsAddingClient(false);
    }
  };

  const openCalendarBooking = () => {
    setShowCalendar(true);
    // Load TidyCal script if not already loaded
    if (!document.getElementById('tidycal-script')) {
      const script = document.createElement('script');
      script.id = 'tidycal-script';
      script.src = 'https://asset-tidycal.b-cdn.net/js/embed.js';
      script.async = true;
      document.head.appendChild(script);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">Loading customer bookings...</div>
      </div>
    );
  }

  const pendingBookings = bookings.filter(b => ['pending', 'contacted'].includes(b.status));
  const scheduledFollowUps = bookings.filter(b => b.next_follow_up_date && !['closed', 'lost', 'not_interested'].includes(b.status));
  const dueFollowUps = scheduledFollowUps.filter(b => isCallDue(b.next_follow_up_date));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Add New Client (Sticky) */}
      <div className="lg:col-span-1">
        <div className="sticky top-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Add New Client
              </CardTitle>
              <CardDescription>Enter client information for follow-up tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Enter client name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="clientEmail">Email Address</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="clientPhone">Phone Number</Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(formatPhoneNumber(e.target.value))}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="clientNotes">Notes</Label>
                <Textarea
                  id="clientNotes"
                  value={newClientNotes}
                  onChange={(e) => setNewClientNotes(e.target.value)}
                  placeholder="Initial conversation notes, interests, concerns..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Button 
                  onClick={addNewClient}
                  disabled={!newClientName.trim() || isAddingClient}
                  className="w-full"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {isAddingClient ? "Adding..." : "Add Client"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={openCalendarBooking}
                  className="w-full"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Book Next Call
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Column - Analytics and Client Lists */}
      <div className="lg:col-span-2 space-y-6">
        {/* Analytics Section */}
        <ProspectAnalytics />
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Now</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {dueFollowUps.length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {scheduledFollowUps.length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {bookings.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Due Follow-ups */}
        {dueFollowUps.length > 0 && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Follow-ups Due Now
              </CardTitle>
              <CardDescription>These calls are scheduled for today or overdue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dueFollowUps.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{booking.name}</span>
                      <Badge className={getStatusColor(booking.status)}>{getStatusLabel(booking.status)}</Badge>
                      {booking.follow_up_sequence && booking.follow_up_sequence > 0 && (
                        <Badge variant="outline">{booking.follow_up_sequence} follow-ups</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {booking.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <a href={`tel:${booking.phone}`} className="hover:underline">{booking.phone}</a>
                        </div>
                      )}
                      {booking.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <a href={`mailto:${booking.email}`} className="hover:underline">{booking.email}</a>
                        </div>
                      )}
                      {booking.next_follow_up_date && (
                        <div className="flex items-center gap-1 text-red-600 font-medium">
                          <CalendarIcon className="w-3 h-3" />
                          Due: {format(new Date(booking.next_follow_up_date), "MMM d, h:mm a")}
                        </div>
                      )}
                    </div>
                  </div>
                  <Dialog open={isDialogOpen && selectedBooking?.id === booking.id} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setSelectedBooking(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        Call Now
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Follow-up Call: {booking.name}</DialogTitle>
                        <DialogDescription>Record your interaction and update status</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="notes">Call Notes</Label>
                          <Textarea 
                            id="notes"
                            value={followUpNotes}
                            onChange={(e) => setFollowUpNotes(e.target.value)}
                            placeholder="What happened in this call?"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Schedule Next Call (Optional)</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {nextCallDate ? format(nextCallDate, "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={nextCallDate}
                                onSelect={setNextCallDate}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => recordFollowUp(booking.id, followUpNotes, nextCallDate)}
                            className="flex-1"
                          >
                            Record Call
                          </Button>
                              <div className="grid grid-cols-3 gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                  onClick={() => updateBookingStatus(booking.id, 'closed')}
                                >
                                  Win
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                                  onClick={() => updateBookingStatus(booking.id, 'lost')}
                                >
                                  Lost
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                                  onClick={() => markAsNoCallNoShow(booking)}
                                >
                                  <UserX className="w-3 h-3 mr-1" />
                                  No Show
                                </Button>
                              </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* All Customer Bookings - Collapsible */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  All Customer Bookings ({bookings.length})
                </CardTitle>
                <CardDescription>Complete list of your customer pipeline</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllBookings(!showAllBookings)}
                className="shrink-0"
              >
                {showAllBookings ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Show
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {showAllBookings && (
            <CardContent>
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                       <div className="flex items-center gap-3 mb-2">
                         <User className="w-4 h-4" />
                         <button 
                           onClick={() => {
                             setCallManagementBooking(booking);
                             setShowCallManagement(true);
                           }}
                           className="font-medium hover:underline hover:text-primary cursor-pointer text-left"
                         >
                           {booking.name}
                         </button>
                         <Badge className={getStatusColor(booking.status)}>{getStatusLabel(booking.status)}</Badge>
                        {booking.follow_up_sequence && booking.follow_up_sequence > 0 && (
                          <Badge variant="outline">{booking.follow_up_sequence} follow-ups</Badge>
                        )}
                        {booking.next_follow_up_date && isCallDue(booking.next_follow_up_date) && (
                          <Badge variant="destructive">Due Now</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {booking.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <a href={`tel:${booking.phone}`} className="hover:underline">{booking.phone}</a>
                          </div>
                        )}
                        {booking.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <a href={`mailto:${booking.email}`} className="hover:underline">{booking.email}</a>
                          </div>
                        )}
                        {booking.next_follow_up_date && (
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            Next: {format(new Date(booking.next_follow_up_date), "MMM d, h:mm a")}
                          </div>
                        )}
                      </div>
                      {/* Original Notes */}
                      {booking.notes && (
                        <div className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium">Initial notes:</span> <span className="italic">"{booking.notes}"</span>
                        </div>
                      )}
                      {/* Follow-up Notes History */}
                      {booking.follow_up_notes && booking.follow_up_notes.length > 0 && (
                        <div className="text-sm text-muted-foreground mt-2">
                          <div className="font-medium">Follow-up history:</div>
                          <div className="ml-2 space-y-1">
                            {booking.follow_up_notes.map((note, index) => (
                              <div key={index} className="border-l-2 border-blue-200 pl-2">
                                <span className="text-xs text-blue-600">Follow-up #{index + 1}:</span> 
                                <span className="italic ml-1">"{note}"</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={isDialogOpen && selectedBooking?.id === booking.id} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) setSelectedBooking(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Follow Up
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Follow-up: {booking.name}</DialogTitle>
                            <DialogDescription>Record your interaction and plan next steps</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="notes">Notes</Label>
                              <Textarea 
                                id="notes"
                                value={followUpNotes}
                                onChange={(e) => setFollowUpNotes(e.target.value)}
                                placeholder="What happened in this interaction?"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>Schedule Next Call (Optional)</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {nextCallDate ? format(nextCallDate, "PPP") : "Pick a date"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={nextCallDate}
                                    onSelect={setNextCallDate}
                                    initialFocus
                                    className={cn("p-3 pointer-events-auto")}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => recordFollowUp(booking.id, followUpNotes, nextCallDate)}
                                className="flex-1"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Record Follow-up
                              </Button>
                               <div className="grid grid-cols-3 gap-2">
                                 <Button 
                                   size="sm" 
                                   variant="outline"
                                   className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                   onClick={() => updateBookingStatus(booking.id, 'closed')}
                                 >
                                   Win
                                 </Button>
                                 <Button 
                                   size="sm" 
                                   variant="outline"
                                   className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                                   onClick={() => updateBookingStatus(booking.id, 'lost')}
                                 >
                                   Lost
                                 </Button>
                                 <Button 
                                   size="sm" 
                                   variant="outline"
                                   className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                                   onClick={() => markAsNoCallNoShow(booking)}
                                 >
                                   <UserX className="w-3 h-3 mr-1" />
                                   No Show
                                 </Button>
                               </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setDeleteConfirmBooking(booking);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* TidyCal Embed Dialog */}
      <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Next Steps Session</DialogTitle>
            <DialogDescription>Book a follow-up call with your client</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div 
              className="tidycal-embed" 
              data-path="palletprosga/nextstepsession"
              style={{ minHeight: '500px' }}
            ></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Call Management Dialog */}
      <CallManagementDialog 
        booking={callManagementBooking}
        isOpen={showCallManagement}
        onClose={() => {
          setShowCallManagement(false);
          setCallManagementBooking(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{deleteConfirmBooking?.name}</strong>? 
              This action cannot be undone and will remove all follow-up history.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmBooking(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteConfirmBooking && deleteBooking(deleteConfirmBooking.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
