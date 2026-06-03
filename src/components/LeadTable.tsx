import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Label } from "@/components/ui/label";
import { Globe } from "lucide-react";
import { toast } from "sonner";
import { Lead } from "@/types/Lead";
import { LTVDialog } from "./LTVDialog";

interface LeadTableProps {
  leads: Lead[];
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
}

export const LeadTable: React.FC<LeadTableProps> = ({ leads, onUpdateLead, onDeleteLead }) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingNotesLead, setEditingNotesLead] = useState<Lead | null>(null);
  const [newNote, setNewNote] = useState('');
  const [showPreviousNotes, setShowPreviousNotes] = useState(false);
  const [showArchivedNotes, setShowArchivedNotes] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [ltvLead, setLtvLead] = useState<Lead | null>(null);
  const [isLtvDialogOpen, setIsLtvDialogOpen] = useState(false);
  const itemsPerPage = 15;

  // Calculate pagination
  const totalPages = Math.ceil(leads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLeads = leads.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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

  const handleWebsite = (email: string) => {
    const domain = email.split('@')[1];
    const website = `https://${domain}`;
    window.open(website, '_blank');
    toast.info(`Opening website: ${domain}`);
  };

  const isNonTraditionalEmail = (email: string) => {
    const traditionalDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
      'icloud.com', 'live.com', 'msn.com', 'mail.com', 'protonmail.com'
    ];
    const domain = email.split('@')[1]?.toLowerCase();
    return domain && !traditionalDomains.includes(domain);
  };

  const handleStatusChange = (lead: Lead, newStatus: string) => {
    const updatedLead = { ...lead, status: newStatus as Lead['status'] };
    onUpdateLead(updatedLead);
    toast.success(`Status updated to ${newStatus}`);
  };

  const handleCurrentCustomerChange = (lead: Lead, isCurrentCustomer: boolean) => {
    if (isCurrentCustomer) {
      // Show LTV dialog when marking as current customer
      setLtvLead(lead);
      setIsLtvDialogOpen(true);
    } else {
      // Simply update to not current customer
      const updatedLead = { ...lead, currentCustomer: false, ltvData: undefined };
      onUpdateLead(updatedLead);
      toast.success('Removed from current customers');
    }
  };

  const handleForklifitAccessChange = (lead: Lead, hasForklifitAccess: boolean) => {
    const updatedLead = { ...lead, forklifitAccess: hasForklifitAccess };
    onUpdateLead(updatedLead);
    toast.success(`Forklift access ${hasForklifitAccess ? 'enabled' : 'disabled'}`);
  };

  const handleServiceTypeChange = (lead: Lead, newServiceType: 'delivery' | 'pickup' | 'both') => {
    const updatedLead = { ...lead, serviceType: newServiceType };
    onUpdateLead(updatedLead);
    toast.success(`Service type updated to ${newServiceType}`);
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead({ ...lead });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingLead) {
      onUpdateLead(editingLead);
      setIsEditDialogOpen(false);
      setEditingLead(null);
      toast.success('Lead updated successfully');
    }
  };

  const handleSaveNotes = () => {
    if (editingNotesLead) {
      onUpdateLead(editingNotesLead);
      setEditingNotesLead(null);
      toast.success('Notes updated successfully');
    }
  };

  const handleCreateNote = () => {
    if (selectedLead && newNote.trim()) {
      const timestamp = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
      const noteEntry = `[${timestamp}] ${newNote.trim()}`;
      const updatedNotes = selectedLead.notes 
        ? `${selectedLead.notes}\n\n${noteEntry}` 
        : noteEntry;
      
      const updatedLead = { ...selectedLead, notes: updatedNotes };
      onUpdateLead(updatedLead);
      setSelectedLead(updatedLead);
      setNewNote('');
      toast.success('Note created successfully');
    }
  };

  const parseNotes = (notesString: string) => {
    if (!notesString) return [];
    
    const noteEntries = notesString.split('\n\n').filter(entry => entry.trim());
    return noteEntries.map((entry, index) => {
      const isArchived = entry.includes('[ARCHIVED]');
      const cleanEntry = entry.replace('[ARCHIVED]', '').trim();
      const timestampMatch = cleanEntry.match(/^\[([^\]]+)\]/);
      const timestamp = timestampMatch ? timestampMatch[1] : '';
      const content = timestampMatch ? cleanEntry.replace(/^\[([^\]]+)\]\s*/, '') : cleanEntry;
      
      return {
        id: index,
        timestamp,
        content,
        isArchived,
        originalEntry: entry
      };
    });
  };

  const handleArchiveNote = (noteIndex: number) => {
    if (!selectedLead) return;
    
    const notes = parseNotes(selectedLead.notes);
    if (noteIndex >= 0 && noteIndex < notes.length) {
      notes[noteIndex].isArchived = true;
      notes[noteIndex].originalEntry = `[ARCHIVED] ${notes[noteIndex].originalEntry.replace('[ARCHIVED]', '').trim()}`;
      
      const updatedNotesString = notes.map(note => note.originalEntry).join('\n\n');
      const updatedLead = { ...selectedLead, notes: updatedNotesString };
      
      onUpdateLead(updatedLead);
      setSelectedLead(updatedLead);
      toast.success('Note archived successfully');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-green-100 text-green-800';
      case 'Contacted': return 'bg-yellow-100 text-yellow-800';
      case 'Client': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allCurrentLeadIds = new Set(currentLeads.map(lead => lead.id));
      setSelectedLeadIds(allCurrentLeadIds);
    } else {
      setSelectedLeadIds(new Set());
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    const newSelected = new Set(selectedLeadIds);
    if (checked) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedLeadIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedLeadIds.size === 0) return;
    
    const count = selectedLeadIds.size;
    for (const leadId of selectedLeadIds) {
      await onDeleteLead(leadId);
    }
    setSelectedLeadIds(new Set());
    toast.success(`Deleted ${count} leads successfully!`);
  };

  const handleDeleteAllLeads = async () => {
    if (deleteConfirmation !== 'DELETE') return;
    
    for (const lead of leads) {
      await onDeleteLead(lead.id);
    }
    setDeleteConfirmation('');
    toast.success(`Deleted all ${leads.length} leads successfully!`);
  };

  const isAllCurrentSelected = currentLeads.length > 0 && currentLeads.every(lead => selectedLeadIds.has(lead.id));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Lead Management ({leads.length} leads - Page {currentPage} of {totalPages || 1})</CardTitle>
          <div className="flex items-center space-x-2">
            {selectedLeadIds.size > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteSelected}
              >
                Delete Selected ({selectedLeadIds.size})
              </Button>
            )}
            {leads.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Delete All Leads
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Leads</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all {leads.length} leads from your database.
                      <br /><br />
                      Type <strong>DELETE</strong> below to confirm:
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    placeholder="Type DELETE to confirm"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAllLeads}
                      disabled={deleteConfirmation !== 'DELETE'}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete All Leads
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-semibold w-8">
                  <Checkbox
                    checked={isAllCurrentSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="text-left p-3 font-semibold">Company / Point of Contact</th>
                <th className="text-left p-3 font-semibold">Contact</th>
                <th className="text-left p-3 font-semibold">Pallet Needs</th>
                <th className="text-left p-3 font-semibold">Service Type</th>
                <th className="text-left p-3 font-semibold">Forklift</th>
                <th className="text-left p-3 font-semibold">Current Customer</th>
                <th className="text-left p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {currentLeads.map((lead) => (
                <tr key={lead.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-3 w-8">
                    <Checkbox
                      checked={selectedLeadIds.has(lead.id)}
                      onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                      aria-label={`Select ${lead.company}`}
                    />
                  </td>
                  <td className="p-3">
                    <div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <button 
                            className="font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer text-left"
                            onClick={() => setSelectedLead(lead)}
                          >
                            {lead.company}
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{selectedLead?.name} - {selectedLead?.company}</DialogTitle>
                          </DialogHeader>
                          {selectedLead && (
                            <div className="space-y-4">
                              {selectedLead.submittedDate && (
                                <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                                  Submitted: {selectedLead.submittedDate}
                                </div>
                              )}
                              
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <Label>Contact Information</Label>
                                  <div className="mt-2 space-y-2 text-sm">
                                    <div>Name: {selectedLead.name}</div>
                                    <div>Phone: {selectedLead.phone}</div>
                                    <div>Email: {selectedLead.email}</div>
                                    <div>Company: {selectedLead.company}</div>
                                  </div>
                                </div>
                                <div>
                                  <Label>Business Details</Label>
                                  <div className="mt-2 space-y-2 text-sm">
                                    <div>Pallet Needs: {selectedLead.palletNeeds}</div>
                                    <div>Service Type: {selectedLead.serviceType === 'delivery' ? 'Delivery' : selectedLead.serviceType === 'pickup' ? 'Pickup' : 'Both'}</div>
                                    <div>Forklift Access: {selectedLead.forklifitAccess ? 'Yes' : 'No'}</div>
                                    <div>Current Customer: {selectedLead.currentCustomer ? 'Yes' : 'No'}</div>
                                    <div>Status: {selectedLead.status}</div>
                                    <div>Date Added: {selectedLead.date}</div>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <Label>Tags</Label>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {selectedLead.tags.length > 0 ? (
                                    selectedLead.tags.map((tag, index) => (
                                      <Badge key={index} variant="secondary">{tag}</Badge>
                                    ))
                                  ) : (
                                    <span className="text-sm text-gray-500">No tags</span>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <Label>Notes</Label>
                                <div className="mt-2 space-y-3">
                                  {/* Create New Note Section */}
                                  <div>
                                    <Textarea
                                      value={newNote}
                                      onChange={(e) => setNewNote(e.target.value)}
                                      placeholder="Create a new note..."
                                      rows={3}
                                    />
                                    <div className="flex space-x-2 mt-2">
                                      <Button 
                                        size="sm" 
                                        onClick={handleCreateNote}
                                        disabled={!newNote.trim()}
                                      >
                                        Create Note
                                      </Button>
                                      {selectedLead.notes && (
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          onClick={() => setShowPreviousNotes(!showPreviousNotes)}
                                        >
                                          {showPreviousNotes ? 'Hide' : 'View'} Previous Notes
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  
                                   {/* Previous Notes Section */}
                                   {showPreviousNotes && selectedLead.notes && (
                                     <div className="bg-gray-50 p-3 rounded border space-y-3">
                                       <div className="flex items-center justify-between">
                                         <Label className="text-sm font-medium text-gray-700">Previous Notes:</Label>
                                         {parseNotes(selectedLead.notes).some(note => note.isArchived) && (
                                           <Button
                                             size="sm"
                                             variant="ghost"
                                             onClick={() => setShowArchivedNotes(!showArchivedNotes)}
                                             className="text-xs"
                                           >
                                             {showArchivedNotes ? 'Hide' : 'Show'} Archived
                                           </Button>
                                         )}
                                       </div>
                                       
                                       <div className="space-y-2 max-h-60 overflow-y-auto">
                                         {parseNotes(selectedLead.notes)
                                           .filter(note => !note.isArchived)
                                           .map((note, index) => (
                                             <div key={note.id} className="bg-white p-2 rounded border text-sm">
                                               <div className="flex items-start justify-between">
                                                 <div className="flex-1">
                                                   <div className="text-xs text-gray-500 mb-1">{note.timestamp}</div>
                                                   <div className="text-gray-700">{note.content}</div>
                                                 </div>
                                                 <Button
                                                   size="sm"
                                                   variant="ghost"
                                                   onClick={() => handleArchiveNote(note.id)}
                                                   className="text-xs text-gray-400 hover:text-red-600 ml-2"
                                                 >
                                                   Archive
                                                 </Button>
                                               </div>
                                             </div>
                                           ))}
                                         
                                         {/* Archived Notes */}
                                         {showArchivedNotes && (
                                           <div className="border-t pt-2 mt-3">
                                             <Label className="text-xs text-gray-500">Archived Notes:</Label>
                                             <div className="space-y-2 mt-2">
                                               {parseNotes(selectedLead.notes)
                                                 .filter(note => note.isArchived)
                                                 .map((note, index) => (
                                                   <div key={note.id} className="bg-gray-100 p-2 rounded border text-sm opacity-75">
                                                     <div className="text-xs text-gray-400 mb-1">{note.timestamp} (Archived)</div>
                                                     <div className="text-gray-600">{note.content}</div>
                                                   </div>
                                                 ))}
                                             </div>
                                           </div>
                                         )}
                                       </div>
                                     </div>
                                   )}
                                </div>
                              </div>
                              
                              <div className="flex space-x-2 pt-4 border-t">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditLead(selectedLead)}
                                >
                                  Edit Lead
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => onDeleteLead(selectedLead.id)}
                                >
                                  Delete Lead
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      {lead.name !== lead.company && (
                        <div className="text-sm text-gray-500">Contact: {lead.name}</div>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="space-y-1">
                      {lead.phone && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{lead.phone}</span>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCall(lead.phone)}
                              className="h-6 w-6 p-0"
                              title="Call"
                            >
                              📞
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSMS(lead.phone)}
                              className="h-6 w-6 p-0"
                              title="SMS"
                            >
                              💬
                            </Button>
                          </div>
                        </div>
                      )}
                      {lead.email && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{lead.email}</span>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEmail(lead.email)}
                              className="h-6 w-6 p-0"
                              title="Email"
                            >
                              ✉️
                            </Button>
                            {isNonTraditionalEmail(lead.email) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleWebsite(lead.email)}
                                className="h-6 w-6 p-0"
                                title="Visit Website"
                              >
                                <Globe className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <span className="text-sm text-gray-700">{lead.palletNeeds}</span>
                  </td>
                  
                  <td className="p-3">
                    <Select
                      value={lead.serviceType}
                      onValueChange={(value) => handleServiceTypeChange(lead, value as 'delivery' | 'pickup' | 'both')}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue>
                          <Badge variant={lead.serviceType === 'delivery' ? 'default' : lead.serviceType === 'pickup' ? 'destructive' : 'secondary'}>
                            {lead.serviceType === 'delivery' ? 'Delivery' : lead.serviceType === 'pickup' ? 'Pickup' : 'Both'}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="delivery">Delivery</SelectItem>
                        <SelectItem value="pickup">Pickup</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  
                  <td className="p-3">
                    <Checkbox
                      checked={lead.forklifitAccess}
                      onCheckedChange={(checked) => handleForklifitAccessChange(lead, checked as boolean)}
                    />
                  </td>
                  
                  <td className="p-3">
                    <Checkbox
                      checked={lead.currentCustomer}
                      onCheckedChange={(checked) => handleCurrentCustomerChange(lead, checked as boolean)}
                    />
                  </td>
                  
                  <td className="p-3">
                    <Select
                      value={lead.status}
                      onValueChange={(value) => handleStatusChange(lead, value)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue>
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
        
        {leads.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No leads found. Import a CSV file to get started.
          </div>
        )}

        {/* Edit Lead Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Lead</DialogTitle>
            </DialogHeader>
            {editingLead && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editingLead.name}
                    onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-company">Company</Label>
                  <Input
                    id="edit-company"
                    value={editingLead.company}
                    onChange={(e) => setEditingLead({ ...editingLead, company: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editingLead.phone}
                    onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingLead.email}
                    onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-pallet-needs">Pallet Needs</Label>
                  <Input
                    id="edit-pallet-needs"
                    value={editingLead.palletNeeds}
                    onChange={(e) => setEditingLead({ ...editingLead, palletNeeds: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-service-type">Service Type</Label>
                  <Select
                    value={editingLead.serviceType}
                    onValueChange={(value) => setEditingLead({ ...editingLead, serviceType: value as 'delivery' | 'pickup' | 'both' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="pickup">Pickup</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-submitted-date">Submitted Date</Label>
                  <Input
                    id="edit-submitted-date"
                    type="date"
                    value={editingLead.submittedDate || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, submittedDate: e.target.value || null })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-date">Date Added</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editingLead.date}
                    onChange={(e) => setEditingLead({ ...editingLead, date: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={editingLead.notes}
                    onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-forklift"
                      checked={editingLead.forklifitAccess}
                      onCheckedChange={(checked) => 
                        setEditingLead({ ...editingLead, forklifitAccess: !!checked })
                      }
                    />
                    <Label htmlFor="edit-forklift">Forklift Access</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-current-customer"
                      checked={editingLead.currentCustomer}
                      onCheckedChange={(checked) => 
                        setEditingLead({ ...editingLead, currentCustomer: !!checked })
                      }
                    />
                    <Label htmlFor="edit-current-customer">Current Customer</Label>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* LTV Dialog */}
        {ltvLead && (
          <LTVDialog
            open={isLtvDialogOpen}
            onOpenChange={setIsLtvDialogOpen}
            lead={ltvLead}
            onSave={(updatedLead) => {
              onUpdateLead(updatedLead);
              toast.success('Customer LTV data saved successfully');
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};