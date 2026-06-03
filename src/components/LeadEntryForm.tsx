import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Lead } from "@/types/Lead";
import { formatPhoneNumber } from "@/utils/phoneFormat";

interface LeadEntryFormProps {
  onAddLead: (lead: Lead) => void;
}

export const LeadEntryForm: React.FC<LeadEntryFormProps> = ({ onAddLead }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    palletNeeds: '',
    serviceType: 'delivery' as 'delivery' | 'pickup' | 'both',
    forklifitAccess: false,
    currentCustomer: false,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    const newLead: Lead = {
      id: crypto.randomUUID(),
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      company: formData.company,
      palletNeeds: formData.palletNeeds,
      serviceType: formData.serviceType,
      forklifitAccess: formData.forklifitAccess,
      currentCustomer: formData.currentCustomer,
      date: new Date().toISOString().split('T')[0],
      submittedDate: null,
      status: 'New',
      notes: formData.notes,
      tags: [],
      lastContact: null,
      followUpDate: null
    };

    onAddLead(newLead);
    toast.success('Lead added successfully');
    setOpen(false);
    
    // Reset form
    setFormData({
      name: '',
      phone: '',
      email: '',
      company: '',
      palletNeeds: '',
      serviceType: 'delivery',
      forklifitAccess: false,
      currentCustomer: false,
      notes: ''
    });
  };

  const handleInputChange = (field: string, value: any) => {
    if (field === 'phone') {
      value = formatPhoneNumber(value);
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter lead name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="Enter company name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Email address"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="palletNeeds">Pallet Needs</Label>
            <Input
              id="palletNeeds"
              value={formData.palletNeeds}
              onChange={(e) => handleInputChange('palletNeeds', e.target.value)}
              placeholder="Describe pallet requirements"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceType">Service Type</Label>
            <Select 
              value={formData.serviceType} 
              onValueChange={(value) => handleInputChange('serviceType', value)}
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

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="forklifitAccess"
                checked={formData.forklifitAccess}
                onCheckedChange={(checked) => handleInputChange('forklifitAccess', checked)}
              />
              <Label htmlFor="forklifitAccess">Has Forklift Access</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="currentCustomer"
                checked={formData.currentCustomer}
                onCheckedChange={(checked) => handleInputChange('currentCustomer', checked)}
              />
              <Label htmlFor="currentCustomer">Current Customer</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes about this lead"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Add Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};