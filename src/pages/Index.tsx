
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnifiedCustomerDashboard } from "@/components/UnifiedCustomerDashboard";
import { toast } from "sonner";
import { LogOut, Copy } from "lucide-react";
import { LeadTable } from "@/components/LeadTable";
import ChartsDashboard from "@/components/ChartsDashboard";
import CSVImporter from "@/components/CSVImporter";
import { ClientsTracker } from "@/components/ClientsTracker";
import { LeadEntryForm } from "@/components/LeadEntryForm";
import { Lead } from "@/types/Lead";
import { useAuth } from "@/hooks/useAuth";
import { useLeads } from "@/hooks/useLeads";

const Index = () => {
  const { user, loading, signOut, isAuthenticated } = useAuth();
  const { leads, loading: leadsLoading, addLeads, updateLead, deleteLead } = useLeads();
  const navigate = useNavigate();
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [forklifitFilter, setForklifitFilter] = useState('all');

  // Check if coming from dashboard route, if not redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth');
    } else if (!loading && isAuthenticated && window.location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [loading, isAuthenticated, navigate]);

  // Filter leads based on search and filters
  useEffect(() => {
    let filtered = leads;

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    if (serviceFilter !== 'all') {
      filtered = filtered.filter(lead =>
        lead.palletNeeds.toLowerCase().includes(serviceFilter.toLowerCase())
      );
    }

    if (forklifitFilter !== 'all') {
      const hasForklift = forklifitFilter === 'true';
      filtered = filtered.filter(lead => lead.forklifitAccess === hasForklift);
    }

    setFilteredLeads(filtered);
  }, [leads, searchTerm, statusFilter, serviceFilter, forklifitFilter]);

  const handleCSVImport = (importedLeads: Lead[]) => {
    addLeads(importedLeads);
  };

  const stats = {
    totalLeads: leads.length,
    newLeads: leads.filter(l => l.status === 'New').length,
    contacted: leads.filter(l => l.status === 'Contacted').length,
    clients: leads.filter(l => l.status === 'Client').length
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  const handleCopyEmails = async () => {
    const emails = filteredLeads
      .map(lead => lead.email)
      .filter(email => email && email.trim() !== '')
      .join(', ');
    
    if (emails) {
      try {
        await navigator.clipboard.writeText(emails);
        toast.success(`Copied ${filteredLeads.filter(lead => lead.email && lead.email.trim() !== '').length} emails to clipboard`);
      } catch (err) {
        toast.error('Failed to copy emails to clipboard');
      }
    } else {
      toast.error('No emails found to copy');
    }
  };

  if (loading || leadsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to auth page
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pallet Business CRM</h1>
            <p className="text-gray-600 mt-1">Manage your leads and track your business growth</p>
          </div>
          <div className="flex items-center gap-4">
            <LeadEntryForm onAddLead={(lead) => addLeads([lead])} />
            <CSVImporter onImport={handleCSVImport} existingLeads={leads} />
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Leads</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalLeads}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">New Leads</p>
                  <p className="text-2xl font-bold text-green-600">{stats.newLeads}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Contacted</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.contacted}</p>
                </div>
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-yellow-600 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Clients</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.clients}</p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-purple-600 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="unified" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="unified">Unified View</TabsTrigger>
            <TabsTrigger value="leads">Lead Management</TabsTrigger>
            <TabsTrigger value="clients">Client Tracking</TabsTrigger>
            <TabsTrigger value="analytics">Analytics & Charts</TabsTrigger>
          </TabsList>

          <TabsContent value="unified" className="space-y-4">
            <UnifiedCustomerDashboard
              leads={filteredLeads}
              prospects={[]} 
              bookings={[]} 
              onLeadUpdate={updateLead}
            />
          </TabsContent>

          <TabsContent value="leads" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filters & Search</CardTitle>
              </CardHeader>
               <CardContent>
                 <div className="grid md:grid-cols-4 gap-4 mb-4">
                   <Input
                     placeholder="Search leads..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                   
                   <Select value={statusFilter} onValueChange={setStatusFilter}>
                     <SelectTrigger>
                       <SelectValue placeholder="Status" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">All Status</SelectItem>
                       <SelectItem value="New">New</SelectItem>
                       <SelectItem value="Contacted">Contacted</SelectItem>
                       <SelectItem value="Client">Client</SelectItem>
                     </SelectContent>
                   </Select>

                   <Select value={serviceFilter} onValueChange={setServiceFilter}>
                     <SelectTrigger>
                       <SelectValue placeholder="Service Type" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">All Services</SelectItem>
                       <SelectItem value="wood">Wood Pallets</SelectItem>
                       <SelectItem value="plastic">Plastic Pallets</SelectItem>
                       <SelectItem value="custom">Custom Pallets</SelectItem>
                     </SelectContent>
                   </Select>

                   <Select value={forklifitFilter} onValueChange={setForklifitFilter}>
                     <SelectTrigger>
                       <SelectValue placeholder="Forklift Access" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">All Access Types</SelectItem>
                       <SelectItem value="true">Has Forklift</SelectItem>
                       <SelectItem value="false">No Forklift</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 
                 <div className="flex justify-end">
                   <Button 
                     variant="outline" 
                     onClick={handleCopyEmails}
                     className="flex items-center gap-2"
                   >
                     <Copy className="h-4 w-4" />
                     Copy All Emails
                   </Button>
                 </div>
               </CardContent>
            </Card>

            {/* Lead Table */}
            <LeadTable leads={filteredLeads} onUpdateLead={updateLead} onDeleteLead={deleteLead} />
          </TabsContent>

          <TabsContent value="clients">
            <ClientsTracker leads={leads} onUpdateLead={updateLead} />
          </TabsContent>

          <TabsContent value="analytics">
            <ChartsDashboard leads={leads} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
