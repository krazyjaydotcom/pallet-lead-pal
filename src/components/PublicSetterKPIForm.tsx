import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SetterKPIFormData {
  date: string;
  touch_points: number;
  calls_pitched: number;
  calls_booked: number;
  notes?: string;
}

interface PublicSetterKPIFormProps {
  token: string;
}

export const PublicSetterKPIForm = ({ token }: PublicSetterKPIFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SetterKPIFormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      touch_points: 0,
      calls_pitched: 0,
      calls_booked: 0,
      notes: ''
    }
  });

  const onSubmit = async (data: SetterKPIFormData) => {
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
            <CardTitle className="text-2xl font-bold">Setter KPI Entry</CardTitle>
            <CardDescription>
              Enter your daily Instagram DM setter performance metrics
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
                <Label htmlFor="touch_points">Touch Points</Label>
                <Input
                  id="touch_points"
                  type="number"
                  min="0"
                  {...register('touch_points', { 
                    required: 'Touch points is required',
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                />
                {errors.touch_points && (
                  <p className="text-sm text-destructive mt-1">{errors.touch_points.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="calls_pitched">Calls Pitched</Label>
                <Input
                  id="calls_pitched"
                  type="number"
                  min="0"
                  {...register('calls_pitched', { 
                    required: 'Calls pitched is required',
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                />
                {errors.calls_pitched && (
                  <p className="text-sm text-destructive mt-1">{errors.calls_pitched.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="calls_booked">Calls Booked</Label>
                <Input
                  id="calls_booked"
                  type="number"
                  min="0"
                  {...register('calls_booked', { 
                    required: 'Calls booked is required',
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                />
                {errors.calls_booked && (
                  <p className="text-sm text-destructive mt-1">{errors.calls_booked.message}</p>
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