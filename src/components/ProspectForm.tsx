
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProspectFormData {
  name: string;
  ig_handle?: string;
  phone?: string;
  email?: string;
  status: 'none' | '1st contact' | 'follow_up' | 'training' | 'confirmed' | 'no_response' | 'ghost';
  follow_up_count: number;
  notes?: string;
  training_reminder_date?: string;
  last_contact_date?: string;
}

interface ProspectFormProps {
  onSubmit: (data: ProspectFormData) => void;
  onCancel: () => void;
}

export const ProspectForm = ({ onSubmit, onCancel }: ProspectFormProps) => {
  const [formData, setFormData] = useState<ProspectFormData>({
    name: '',
    ig_handle: '',
    phone: '',
    email: '',
    status: 'none',
    follow_up_count: 0,
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('ProspectForm: Submitting form data:', formData);
    
    if (!formData.name.trim()) {
      console.error('ProspectForm: Name is required');
      return;
    }
    
    const submissionData = {
      ...formData,
      last_contact_date: new Date().toISOString(),
    };
    
    console.log('ProspectForm: Calling onSubmit with:', submissionData);
    onSubmit(submissionData);
  };

  const handleChange = (field: keyof ProspectFormData, value: string | number) => {
    console.log('ProspectForm: Field change:', field, value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter prospect name"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="ig_handle">Instagram Handle</Label>
          <Input
            id="ig_handle"
            value={formData.ig_handle}
            onChange={(e) => handleChange('ig_handle', e.target.value)}
            placeholder="@username"
          />
        </div>
        
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="Phone number"
          />
        </div>
        
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="Email address"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Add notes about this prospect..."
          rows={3}
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Add Prospect
        </Button>
      </div>
    </form>
  );
};
