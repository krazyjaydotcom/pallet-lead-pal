import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Clock, TrendingUp, Filter } from "lucide-react";
import { CustomerActionCard } from "./CustomerActionCard";
import { UnifiedCustomerPanel } from "./UnifiedCustomerPanel";
import { Lead } from "@/types/Lead";

interface UnifiedCustomerDashboardProps {
  leads: Lead[];
  prospects: any[];
  bookings: any[];
  onLeadUpdate: (lead: Lead) => void;
}

export const UnifiedCustomerDashboard: React.FC<UnifiedCustomerDashboardProps> = ({
  leads,
  prospects,
  bookings,
  onLeadUpdate
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Combine all customer data into unified format
  const allCustomers = useMemo(() => {
    const customerData = [
      ...leads.map(lead => ({
        ...lead,
        type: 'lead',
        priority: getPriority(lead.status, lead.lastContact),
        nextAction: getNextAction('lead', lead.status, lead.lastContact)
      })),
      ...prospects.map(prospect => ({
        ...prospect,
        type: 'prospect',
        priority: getPriority(prospect.status, prospect.last_contact_date),
        nextAction: getNextAction('prospect', prospect.status, prospect.last_contact_date)
      })),
      ...bookings.map(booking => ({
        ...booking,
        type: 'booking',
        priority: getPriority(booking.status, booking.last_contact_date),
        nextAction: getNextAction('booking', booking.status, booking.last_contact_date)
      }))
    ];

    return customerData
      .filter(customer => {
        const matchesSearch = customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            customer.company?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => b.priority - a.priority);
  }, [leads, prospects, bookings, searchTerm, statusFilter]);

  const priorityCustomers = allCustomers.filter(customer => customer.priority >= 8);
  const stats = {
    total: allCustomers.length,
    actionRequired: priorityCustomers.length,
    newToday: allCustomers.filter(c => isToday(c.created_at)).length,
    followUpsDue: allCustomers.filter(c => c.follow_up_date && isPastDue(c.follow_up_date)).length
  };

  const handleCustomerClick = (customer: any) => {
    setSelectedCustomer(customer);
    setIsPanelOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{stats.actionRequired}</p>
                <p className="text-xs text-muted-foreground">Action Required</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <div>
                <p className="text-2xl font-bold">{stats.newToday}</p>
                <p className="text-xs text-muted-foreground">New Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-bold text-warning">{stats.followUpsDue}</p>
                <p className="text-xs text-muted-foreground">Follow-ups Due</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="New">New</SelectItem>
            <SelectItem value="Contacted">Contacted</SelectItem>
            <SelectItem value="Qualified">Qualified</SelectItem>
            <SelectItem value="Client">Client</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Priority Queue */}
      {priorityCustomers.length > 0 && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Action Required Now ({priorityCustomers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {priorityCustomers.slice(0, 3).map((customer) => (
                <CustomerActionCard
                  key={`${customer.type}-${customer.id}`}
                  customer={customer}
                  onClick={() => handleCustomerClick(customer)}
                  variant="priority"
                />
              ))}
              {priorityCustomers.length > 3 && (
                <Button variant="outline" size="sm" className="mt-2">
                  View {priorityCustomers.length - 3} more urgent items
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Customers Grid */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers ({allCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {allCustomers.map((customer) => (
              <CustomerActionCard
                key={`${customer.type}-${customer.id}`}
                customer={customer}
                onClick={() => handleCustomerClick(customer)}
              />
            ))}
            {allCustomers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No customers match your current filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unified Customer Panel */}
      <UnifiedCustomerPanel
        customer={selectedCustomer}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onUpdate={(updatedCustomer) => {
          if (updatedCustomer.type === 'lead') {
            onLeadUpdate(updatedCustomer);
          }
          // Handle other types as needed
        }}
      />
    </div>
  );
};

// Helper functions
function getPriority(status: string, lastContact: string | null): number {
  const daysSinceContact = lastContact ? getDaysSince(lastContact) : 999;
  
  if (status === 'New') return 10;
  if (daysSinceContact > 7) return 9;
  if (daysSinceContact > 3) return 7;
  if (status === 'Qualified') return 8;
  if (status === 'pending') return 6;
  return 5;
}

function getNextAction(type: string, status: string, lastContact: string | null): string {
  const daysSinceContact = lastContact ? getDaysSince(lastContact) : 999;
  
  if (status === 'New') return 'Make first contact';
  if (daysSinceContact > 7) return 'Urgent follow-up needed';
  if (daysSinceContact > 3) return 'Schedule follow-up call';
  if (type === 'booking' && status === 'pending') return 'Confirm appointment';
  if (status === 'Qualified') return 'Schedule sales call';
  return 'Continue nurturing';
}

function getDaysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function isToday(date: string): boolean {
  return new Date(date).toDateString() === new Date().toDateString();
}

function isPastDue(date: string): boolean {
  return new Date(date) < new Date();
}