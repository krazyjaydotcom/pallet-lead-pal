import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Phone, Mail, MessageCircle, User } from 'lucide-react';
import { toast } from 'sonner';

interface ConfirmedBooking {
  id: string;
  prospect_id: string;
  setter_user_id: string;
  closer_user_id?: string;
  name: string;
  ig_handle?: string;
  phone?: string;
  email?: string;
  notes?: string;
  status: 'pending' | 'assigned' | 'contacted' | 'closed';
  created_at: string;
  updated_at: string;
}

export const ConfirmedBookingsList = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<ConfirmedBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('confirmed_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings((data || []) as ConfirmedBooking[]);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load confirmed bookings');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: ConfirmedBooking['status']) => {
    try {
      let updates: any = {
        status: newStatus,
      };

      // Assign to current user if not already assigned
      if (newStatus === 'assigned' && !bookings.find(b => b.id === bookingId)?.closer_user_id) {
        updates.closer_user_id = user?.id;
      }

      const { error } = await supabase
        .from('confirmed_bookings')
        .update(updates)
        .eq('id', bookingId);

      if (error) throw error;

      await loadBookings();
      toast.success('Booking status updated');
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Failed to update booking status');
    }
  };

  const statusColors = {
    pending: 'bg-yellow-500',
    assigned: 'bg-blue-500',
    contacted: 'bg-purple-500',
    closed: 'bg-green-500',
  };

  const statusLabels = {
    pending: 'Pending',
    assigned: 'Assigned',
    contacted: 'Contacted',
    closed: 'Closed',
  };

  if (loading) {
    return <div>Loading confirmed bookings...</div>;
  }

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const assignedBookings = bookings.filter(b => b.status === 'assigned' && b.closer_user_id === user?.id);
  const otherBookings = bookings.filter(b => 
    (b.status === 'contacted' || b.status === 'closed') && 
    (b.closer_user_id === user?.id || b.setter_user_id === user?.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Confirmed Bookings</h3>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            Pending ({pendingBookings.length})
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            My Assigned ({assignedBookings.length})
          </span>
        </div>
      </div>

      {pendingBookings.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-yellow-600 flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            Available Bookings ({pendingBookings.length})
          </h4>
          {pendingBookings.map((booking) => (
            <Card key={booking.id} className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="font-semibold">{booking.name}</h5>
                      <Badge className={`${statusColors[booking.status]} text-white`}>
                        {statusLabels[booking.status]}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {booking.ig_handle && (
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" />
                          {booking.ig_handle}
                        </div>
                      )}
                      {booking.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {booking.phone}
                        </div>
                      )}
                      {booking.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {booking.email}
                        </div>
                      )}
                    </div>
                    
                    {booking.notes && (
                      <p className="text-sm mt-2 p-2 bg-white rounded border">
                        {booking.notes}
                      </p>
                    )}
                  </div>
                  
                  <Button 
                    size="sm"
                    onClick={() => updateBookingStatus(booking.id, 'assigned')}
                  >
                    Assign to Me
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {assignedBookings.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-blue-600 flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            My Assigned Bookings ({assignedBookings.length})
          </h4>
          {assignedBookings.map((booking) => (
            <Card key={booking.id} className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="font-semibold">{booking.name}</h5>
                      <Badge className={`${statusColors[booking.status]} text-white`}>
                        {statusLabels[booking.status]}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {booking.ig_handle && (
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" />
                          {booking.ig_handle}
                        </div>
                      )}
                      {booking.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {booking.phone}
                        </div>
                      )}
                      {booking.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {booking.email}
                        </div>
                      )}
                    </div>
                    
                    {booking.notes && (
                      <p className="text-sm mt-2 p-2 bg-white rounded border">
                        {booking.notes}
                      </p>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => updateBookingStatus(booking.id, 'contacted')}
                      >
                        Mark as Contacted
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => updateBookingStatus(booking.id, 'closed')}
                      >
                        Mark as Closed
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {otherBookings.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-muted-foreground">Recent Activity</h4>
          {otherBookings.slice(0, 5).map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="font-semibold">{booking.name}</h5>
                      <Badge className={`${statusColors[booking.status]} text-white`}>
                        {statusLabels[booking.status]}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {booking.ig_handle && (
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" />
                          {booking.ig_handle}
                        </div>
                      )}
                      {booking.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {booking.phone}
                        </div>
                      )}
                      {booking.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {booking.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {bookings.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No confirmed bookings yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
};