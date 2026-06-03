import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CSMKPIFormData {
  date: string;
  client_check_ins: number;
  issues_resolved: number;
  upsells_completed: number;
  client_satisfaction_score?: number;
  retention_rate?: number;
  notes?: string;
}

interface PublicCSMKPIFormProps {
  token: string;
}

export const PublicCSMKPIForm = ({ token }: PublicCSMKPIFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CSMKPIFormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      client_check_ins: 0,
      issues_resolved: 0,
      upsells_completed: 0,
      client_satisfaction_score: undefined,
      retention_rate: undefined,
      notes: ''
    }
  });

  const onSubmit = async (data: CSMKPIFormData) => {
    setIsSubmitting(true);
    
    try {
      const { data: result, error } = await supabase.functions.invoke('public-kpi-submit', {
        body: {
          token,
          kpiData: data
        }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "KPI data has been submitted successfully.",
      });
      
      reset();
    } catch (error) {
      console.error('Error submitting KPI data:', error);
      toast({
        title: "Error",
        description: "Failed to submit KPI data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="container mx-auto max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">CSM KPI Entry</CardTitle>
            <CardDescription>
              Enter your daily client success management metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  {...register('date', { required: 'Date is required' })}
                />
                {errors.date && (
                  <p className="text-sm text-destructive mt-1">{errors.date.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="client_check_ins">Client Check-ins</Label>
                <Input
                  id="client_check_ins"
                  type="number"
                  min="0"
                  {...register('client_check_ins', { 
                    required: 'Client check-ins is required',
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                />
                {errors.client_check_ins && (
                  <p className="text-sm text-destructive mt-1">{errors.client_check_ins.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="issues_resolved">Issues Resolved</Label>
                <Input
                  id="issues_resolved"
                  type="number"
                  min="0"
                  {...register('issues_resolved', { 
                    required: 'Issues resolved is required',
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                />
                {errors.issues_resolved && (
                  <p className="text-sm text-destructive mt-1">{errors.issues_resolved.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="upsells_completed">Upsells Completed</Label>
                <Input
                  id="upsells_completed"
                  type="number"
                  min="0"
                  {...register('upsells_completed', { 
                    required: 'Upsells completed is required',
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                />
                {errors.upsells_completed && (
                  <p className="text-sm text-destructive mt-1">{errors.upsells_completed.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="client_satisfaction_score">Client Satisfaction Score (1-5, Optional)</Label>
                <Input
                  id="client_satisfaction_score"
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  {...register('client_satisfaction_score', { 
                    min: { value: 1, message: 'Must be between 1 and 5' },
                    max: { value: 5, message: 'Must be between 1 and 5' }
                  })}
                />
                {errors.client_satisfaction_score && (
                  <p className="text-sm text-destructive mt-1">{errors.client_satisfaction_score.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="retention_rate">Retention Rate (%, Optional)</Label>
                <Input
                  id="retention_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  {...register('retention_rate', { 
                    min: { value: 0, message: 'Must be between 0 and 100' },
                    max: { value: 100, message: 'Must be between 0 and 100' }
                  })}
                />
                {errors.retention_rate && (
                  <p className="text-sm text-destructive mt-1">{errors.retention_rate.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes about your performance today..."
                  {...register('notes')}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit KPI Data'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};