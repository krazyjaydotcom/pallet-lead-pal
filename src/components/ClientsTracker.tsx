import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lead } from "@/types/Lead";
import { format, addDays, differenceInDays } from 'date-fns';

interface ClientsTrackerProps {
  leads: Lead[];
  onUpdateLead: (lead: Lead) => void;
}

export const ClientsTracker: React.FC<ClientsTrackerProps> = ({ leads, onUpdateLead }) => {
  const [sortBy, setSortBy] = useState<'name' | 'lastContact' | 'company'>('lastContact');
  const [filterBy, setFilterBy] = useState<'all' | 'recent' | 'overdue'>('all');

  // Filter only clients (current customers)
  const clients = useMemo(() => {
    return leads.filter(lead => lead.currentCustomer);
  }, [leads]);

  // Apply additional filters and sorting
  const filteredClients = useMemo(() => {
    let filtered = [...clients];

    // Apply filters
    if (filterBy === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter(client => 
        client.lastContact && new Date(client.lastContact) >= sevenDaysAgo
      );
    } else if (filterBy === 'overdue') {
      const today = new Date();
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      filtered = filtered.filter(client => {
        const follow = client.followUpDate ? new Date(client.followUpDate) : null;
        const last = client.lastContact ? new Date(client.lastContact) : null;
        return (follow ? follow < today : (last ? last < sixtyDaysAgo : true));
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'company':
          return a.company.localeCompare(b.company);
        case 'lastContact':
          if (!a.lastContact && !b.lastContact) return 0;
          if (!a.lastContact) return 1;
          if (!b.lastContact) return -1;
          return new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [clients, sortBy, filterBy]);

  const handleMarkContacted = (client: Lead) => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const nextContact = addDays(today, 75); // default cadence: 60-90 days -> midpoint 75
    const nextContactStr = format(nextContact, 'yyyy-MM-dd');
    const updatedClient: Lead = { ...client, lastContact: todayStr, followUpDate: nextContactStr };
    onUpdateLead(updatedClient);
    toast.success('Contact updated • Next follow-up set in 75 days');
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`);
    toast.info(`Opening dialer for ${phone}`);
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`);
    toast.info(`Opening email client for ${email}`);
  };

  const handleSMS = (phone: string) => {
    window.open(`sms:${phone}`);
    toast.info(`Opening SMS for ${phone}`);
  };

  const getContactStatus = (lastContact: string | null) => {
    if (!lastContact) {
      return { status: 'Never contacted', color: 'bg-red-100 text-red-800' };
    }

    const daysSinceContact = Math.floor(
      (new Date().getTime() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceContact <= 7) {
      return { status: 'Recently contacted', color: 'bg-green-100 text-green-800' };
    } else if (daysSinceContact <= 30) {
      return { status: 'Follow up soon', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { status: 'Overdue contact', color: 'bg-red-100 text-red-800' };
    }
  };

  const getNextContactInfo = (client: Lead) => {
    const today = new Date();
    const nextDate = client.followUpDate
      ? new Date(client.followUpDate)
      : client.lastContact
        ? addDays(new Date(client.lastContact), 75)
        : addDays(today, 60);
    const daysRemaining = differenceInDays(nextDate, today);

    let badgeVariant: 'secondary' | 'destructive' | 'default' = 'secondary';
    let label = '';

    if (daysRemaining < 0) {
      badgeVariant = 'destructive';
      label = `Overdue by ${Math.abs(daysRemaining)}d`;
    } else if (daysRemaining === 0) {
      badgeVariant = 'default';
      label = 'Due today';
    } else if (daysRemaining <= 14) {
      badgeVariant = 'default';
      label = `Due in ${daysRemaining}d`;
    } else {
      badgeVariant = 'secondary';
      label = `In ${daysRemaining}d`;
    }

    return { nextDate, daysRemaining, badgeVariant, label };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Management ({clients.length} clients)</CardTitle>
        <div className="flex gap-4">
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastContact">Last Contact</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="company">Company</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="recent">Recently Contacted</SelectItem>
              <SelectItem value="overdue">Overdue Contact</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-semibold">Client</th>
                <th className="text-left p-3 font-semibold">Contact Info</th>
                <th className="text-left p-3 font-semibold">Last Contact</th>
                <th className="text-left p-3 font-semibold">Next Contact</th>
                <th className="text-left p-3 font-semibold">Status</th>
                <th className="text-left p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const contactStatus = getContactStatus(client.lastContact);
                const nextInfo = getNextContactInfo(client);
                return (
                  <tr key={client.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <div>
                        <div className="font-semibold text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-500">{client.company}</div>
                      </div>
                    </td>
                    
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{client.phone}</span>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCall(client.phone)}
                              className="h-6 w-6 p-0"
                              title="Call"
                            >
                              📞
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSMS(client.phone)}
                              className="h-6 w-6 p-0"
                              title="SMS"
                            >
                              💬
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{client.email}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEmail(client.email)}
                            className="h-6 w-6 p-0"
                            title="Email"
                          >
                            ✉️
                          </Button>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-3">
                      <div className="text-sm text-gray-700">
                        {client.lastContact 
                          ? new Date(client.lastContact).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="text-sm text-gray-700">
                        {nextInfo.nextDate ? new Date(nextInfo.nextDate).toLocaleDateString() : 'Not set'}
                      </div>
                      <div className="mt-1">
                        <Badge variant={nextInfo.badgeVariant}>{nextInfo.label}</Badge>
                      </div>
                    </td>
                    
                    <td className="p-3">
                      <Badge className={contactStatus.color}>
                        {contactStatus.status}
                      </Badge>
                    </td>
                    
                    <td className="p-3">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkContacted(client)}
                        >
                          Mark Contacted
                        </Button>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{client.name} - Client Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <Label>Contact Information</Label>
                                  <div className="mt-2 space-y-2 text-sm">
                                    <div>Company: {client.company}</div>
                                    <div>Phone: {client.phone}</div>
                                    <div>Email: {client.email}</div>
                                  </div>
                                </div>
                                <div>
                                  <Label>Business Details</Label>
                                  <div className="mt-2 space-y-2 text-sm">
                                    <div>Pallet Needs: {client.palletNeeds}</div>
                                    <div>Forklift Access: {client.forklifitAccess ? 'Yes' : 'No'}</div>
                                    <div>Client Since: {client.date}</div>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <Label>Contact History</Label>
                                <div className="mt-2 space-y-2 text-sm">
                                  <div>Last Contact: {client.lastContact 
                                    ? new Date(client.lastContact).toLocaleDateString()
                                    : 'Never contacted'
                                  }</div>
                                  <div>Follow-up Date: {client.followUpDate 
                                    ? new Date(client.followUpDate).toLocaleDateString()
                                    : 'Not set'
                                  }</div>
                                </div>
                              </div>
                              
                              {client.notes && (
                                <div>
                                  <Label>Notes</Label>
                                  <div className="mt-2">
                                    <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded-md">
                                      {client.notes}
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {client.tags.length > 0 && (
                                <div>
                                  <Label>Tags</Label>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {client.tags.map((tag, index) => (
                                      <Badge key={index} variant="secondary">{tag}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredClients.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {clients.length === 0 
              ? "No clients yet. Mark leads as current customers to see them here."
              : "No clients match the current filter."
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
};