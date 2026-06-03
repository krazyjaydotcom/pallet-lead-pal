import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CloserKPIFormData {
  date: string;
  units_sold: number;
  calls_made: number;
  clients_signed: number;
  cash_collected: number;
  notes?: string;
}

interface PublicCloserKPIFormProps {
  token: string;
}

export const PublicCloserKPIForm = ({ token }: PublicCloserKPIFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CloserKPIFormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      units_sold: 0,
      calls_made: 0,
      clients_signed: 0,
      cash_collected: 0,
      notes: ''
    }
  });

  const onSubmit = async (data: CloserKPIFormData) => {
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
            <CardTitle className="text-2xl font-bold">Closer KPI Entry</CardTitle>
            <CardDescription>
              Enter your daily sales performance metrics
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
                <Label htmlFor="units_sold">Units Sold</Label>
                <Input
                  id="units_sold"
                  type="number"
                  min="0"
                  {...register('units_sold', { 
                    required: 'Units sold is required',
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                />
                {errors.units_sold && (
                  <p className="text-sm text-destructive mt-1">{errors.units_sold.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="calls_made">Calls Made</Label>
                <Input
                  id="calls_made"
                  type="number"
                  min="0"
                  {...register('calls_made', { 
                    required: 'Calls made is required',
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                />
                {errors.calls_made && (
                  <p className="text-sm text-destructive mt-1">{errors.calls_made.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="clients_signed">Clients Signed</Label>
                <Input
                  id="clients_signed"
                  type="number"
                  min="0"
                  {...register('clients_signed', { 
                    required: 'Clients signed is required',
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                />
                {errors.clients_signed && (
                  <p className="text-sm text-destructive mt-1">{errors.clients_signed.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="cash_collected">Cash Collected ($)</Label>
                <Input
                  id="cash_collected"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('cash_collected', { 
                    required: 'Cash collected is required',
                    min: { value: 0, message: 'Must be 0 or greater' }
                  })}
                />
                {errors.cash_collected && (
                  <p className="text-sm text-destructive mt-1">{errors.cash_collected.message}</p>
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