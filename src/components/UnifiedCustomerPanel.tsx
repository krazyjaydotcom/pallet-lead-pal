import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { 
  Phone, 
  Mail, 
  Calendar as CalendarIcon, 
  User, 
  Building, 
  ExternalLink,
  Save,
  Send,
  Clock,
  MessageSquare,
  Presentation,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UnifiedCustomerPanelProps {
  customer: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (customer: any) => void;
}

export const UnifiedCustomerPanel: React.FC<UnifiedCustomerPanelProps> = ({
  customer,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [followUpDate, setFollowUpDate] = useState<Date>();
  const [emailFormData, setEmailFormData] = useState({
    firstName: "",
    email: ""
  });

  useEffect(() => {
    if (customer) {
      setNotes(customer.notes || "");
      setStatus(customer.status || "");
      setEmailFormData({
        firstName: customer.name?.split(' ')[0] || "",
        email: customer.email || ""
      });
      if (customer.follow_up_date || customer.next_follow_up_date) {
        setFollowUpDate(new Date(customer.follow_up_date || customer.next_follow_up_date));
      }
    }
  }, [customer]);

  // Load SendFox script when panel opens
  useEffect(() => {
    if (isOpen) {
      const script = document.createElement('script');
      script.src = 'https://cdn.sendfox.com/js/form.js';
      script.charset = 'utf-8';
      script.async = true;
      document.head.appendChild(script);

      return () => {
        const existingScript = document.querySelector('script[src="https://cdn.sendfox.com/js/form.js"]');
        if (existingScript) {
          existingScript.remove();
        }
      };
    }
  }, [isOpen]);

  const handleSave = () => {
    const updatedCustomer = {
      ...customer,
      notes,
      status,
      follow_up_date: followUpDate?.toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    };
    onUpdate(updatedCustomer);
  };

  const handleCall = () => {
    if (customer?.phone) {
      window.open(`tel:${customer.phone}`, '_self');
    }
  };

  const openPresentation = () => {
    window.open("https://pallet-pros-academy.lovable.app/", "_blank");
  };

  const getStatusOptions = () => {
    if (customer?.type === 'lead') {
      return ['New', 'Contacted', 'Qualified', 'Client', 'Not Interested'];
    }
    if (customer?.type === 'booking') {
      return ['pending', 'confirmed', 'completed', 'cancelled'];
    }
    return ['new', 'contacted', 'qualified', 'converted', 'lost'];
  };

  const formatLastContact = (lastContact: string | null) => {
    if (!lastContact) return 'Never contacted';
    const days = Math.floor((Date.now() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  if (!customer) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>{customer.name}</span>
            <Badge className="ml-2">{customer.type}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="font-medium">{customer.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p className="font-medium capitalize">{customer.status}</p>
                </div>
                {customer.company && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Company</Label>
                    <p className="font-medium">{customer.company}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Last Contact</Label>
                  <p className="font-medium">
                    {formatLastContact(customer.last_contact_date || customer.lastContact)}
                  </p>
                </div>
              </div>

              {/* Contact Methods */}
              <div className="flex flex-wrap gap-2 mt-4">
                {customer.phone && (
                  <Button onClick={handleCall} size="sm" className="flex-1">
                    <Phone className="h-3 w-3 mr-1" />
                    Call Now
                  </Button>
                )}
                {customer.email && (
                  <Button 
                    onClick={() => window.open(`mailto:${customer.email}`, '_blank')}
                    size="sm" 
                    variant="secondary"
                    className="flex-1"
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </Button>
                )}
              </div>
              
              <Button onClick={openPresentation} size="sm" variant="outline" className="w-full">
                <Presentation className="h-3 w-3 mr-1" />
                Open Presentation
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Updates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Update */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {getStatusOptions().map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Follow-up Date */}
              <div className="space-y-2">
                <Label>Follow-up Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !followUpDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {followUpDate ? format(followUpDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={followUpDate}
                      onSelect={setFollowUpDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button onClick={handleSave} className="w-full">
                <Save className="h-3 w-3 mr-1" />
                Save Updates
              </Button>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this customer..."
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>

          {/* Email Follow-up */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Send Follow-up Email</CardTitle>
            </CardHeader>
            <CardContent>
              <form 
                method="post" 
                action="https://sendfox.com/form/1kgjlj/1056rr" 
                className="sendfox-form space-y-4" 
                id="1056rr" 
                data-async="true" 
                data-recaptcha="false"
              >
                <div className="space-y-2">
                  <Label htmlFor="sendfox_form_name">First Name</Label>
                  <Input 
                    type="text" 
                    id="sendfox_form_name" 
                    placeholder="First Name" 
                    name="first_name" 
                    value={emailFormData.firstName}
                    onChange={(e) => setEmailFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sendfox_form_email">Email</Label>
                  <Input 
                    type="email" 
                    id="sendfox_form_email" 
                    placeholder="Email" 
                    name="email" 
                    value={emailFormData.email}
                    onChange={(e) => setEmailFormData(prev => ({ ...prev, email: e.target.value }))}
                    required 
                  />
                </div>
                
                {/* Anti-bot field */}
                <div style={{ position: 'absolute', left: '-5000px' }} aria-hidden="true">
                  <input type="text" name="a_password" tabIndex={-1} defaultValue="" autoComplete="off" />
                </div>
                
                <Button type="submit" className="w-full" variant="secondary">
                  <Send className="w-4 h-4 mr-2" />
                  Send Follow-up Email
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};