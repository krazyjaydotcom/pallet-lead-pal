import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Phone, Mail, Calendar, User, Presentation, Send } from "lucide-react";

interface ConfirmedBooking {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  ig_handle?: string;
  notes?: string;
  status: string;
  last_contact_date?: string;
  next_follow_up_date?: string;
  follow_up_notes?: string[];
}

interface CallManagementDialogProps {
  booking: ConfirmedBooking | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CallManagementDialog: React.FC<CallManagementDialogProps> = ({
  booking,
  isOpen,
  onClose,
}) => {
  const openPresentation = () => {
    window.open("https://pallet-pros-academy.lovable.app/", "_blank");
  };

  // Load SendFox script when dialog opens
  useEffect(() => {
    if (isOpen) {
      const script = document.createElement('script');
      script.src = 'https://cdn.sendfox.com/js/form.js';
      script.charset = 'utf-8';
      script.async = true;
      document.head.appendChild(script);

      return () => {
        // Clean up script when dialog closes
        const existingScript = document.querySelector('script[src="https://cdn.sendfox.com/js/form.js"]');
        if (existingScript) {
          existingScript.remove();
        }
      };
    }
  }, [isOpen]);

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Call Management: {booking.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {booking.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${booking.phone}`} className="hover:underline">
                      {booking.phone}
                    </a>
                  </div>
                )}
                {booking.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${booking.email}`} className="hover:underline">
                      {booking.email}
                    </a>
                  </div>
                )}
                {booking.ig_handle && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 text-muted-foreground">@</span>
                    <span>{booking.ig_handle}</span>
                  </div>
                )}
              </div>
              
              {booking.notes && (
                <div className="pt-2">
                  <p className="font-medium text-sm">Initial Notes:</p>
                  <p className="text-sm text-muted-foreground italic">"{booking.notes}"</p>
                </div>
              )}

              {booking.follow_up_notes && booking.follow_up_notes.length > 0 && (
                <div className="pt-2">
                  <p className="font-medium text-sm">Call History:</p>
                  <div className="space-y-1 mt-1">
                    {booking.follow_up_notes.map((note, index) => (
                      <div key={index} className="text-sm text-muted-foreground border-l-2 border-blue-200 pl-2">
                        <span className="text-xs text-blue-600">Call #{index + 1}:</span>
                        <span className="italic ml-1">"{note}"</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Call Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={openPresentation}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                size="lg"
              >
                <Presentation className="w-5 h-5 mr-2" />
                Open Presentation
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={onClose}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Follow-up
                </Button>
                <Button variant="outline" onClick={onClose}>
                  <Phone className="w-4 h-4 mr-2" />
                  End Call
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Follow-up */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">After Call Email Follow-up</CardTitle>
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
                  <Label htmlFor="sendfox_form_name">First Name:</Label>
                  <Input 
                    type="text" 
                    id="sendfox_form_name" 
                    placeholder="First Name" 
                    name="first_name" 
                    defaultValue={booking.name.split(' ')[0] || ''}
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sendfox_form_email">Email:</Label>
                  <Input 
                    type="email" 
                    id="sendfox_form_email" 
                    placeholder="Email" 
                    name="email" 
                    defaultValue={booking.email || ''}
                    required 
                  />
                </div>
                
                {/* Anti-bot field */}
                <div style={{ position: 'absolute', left: '-5000px' }} aria-hidden="true">
                  <input type="text" name="a_password" tabIndex={-1} defaultValue="" autoComplete="off" />
                </div>
                
                <Button type="submit" className="w-full" variant="secondary">
                  <Send className="w-4 h-4 mr-2" />
                  Send After-Call Email Follow-up
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};