import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Phone, Mail, MessageCircle } from 'lucide-react';
import { Prospect } from './ProspectManager';

interface TrainingReminderListProps {
  prospects: Prospect[];
  onUpdateStatus: (prospectId: string, status: Prospect['status']) => void;
}

export const TrainingReminderList = ({ prospects, onUpdateStatus }: TrainingReminderListProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const isReminderDue = (reminderDate?: string) => {
    if (!reminderDate) return false;
    return new Date(reminderDate) <= currentTime;
  };

  const getTimeUntilReminder = (reminderDate?: string) => {
    if (!reminderDate) return '';
    
    const reminder = new Date(reminderDate);
    const diff = reminder.getTime() - currentTime.getTime();
    
    if (diff <= 0) return 'Due now!';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  const dueReminders = prospects.filter(p => isReminderDue(p.training_reminder_date));
  const upcomingReminders = prospects.filter(p => !isReminderDue(p.training_reminder_date));

  if (prospects.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No prospects in training list.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {dueReminders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-red-600 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Due for Follow-up ({dueReminders.length})
          </h3>
          <div className="space-y-4">
            {dueReminders.map((prospect) => (
              <Card key={prospect.id} className="border-red-200 bg-red-50">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{prospect.name}</h4>
                        <Badge variant="destructive">
                          Due Now!
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {prospect.ig_handle && (
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            {prospect.ig_handle}
                          </div>
                        )}
                        {prospect.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {prospect.phone}
                          </div>
                        )}
                        {prospect.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {prospect.email}
                          </div>
                        )}
                      </div>
                      
                      {prospect.notes && (
                        <p className="text-sm mt-2 p-2 bg-white rounded border">
                          {prospect.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        onClick={() => onUpdateStatus(prospect.id, 'follow_up')}
                      >
                        Follow Up
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onUpdateStatus(prospect.id, 'confirmed')}
                      >
                        Confirmed
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {upcomingReminders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Upcoming Reminders ({upcomingReminders.length})
          </h3>
          <div className="space-y-4">
            {upcomingReminders.map((prospect) => (
              <Card key={prospect.id}>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{prospect.name}</h4>
                        <Badge variant="secondary">
                          {getTimeUntilReminder(prospect.training_reminder_date)}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {prospect.ig_handle && (
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            {prospect.ig_handle}
                          </div>
                        )}
                        {prospect.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {prospect.phone}
                          </div>
                        )}
                        {prospect.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {prospect.email}
                          </div>
                        )}
                      </div>
                      
                      {prospect.notes && (
                        <p className="text-sm mt-2 p-2 bg-muted rounded">
                          {prospect.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onUpdateStatus(prospect.id, 'follow_up')}
                      >
                        Follow Up Now
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => onUpdateStatus(prospect.id, 'confirmed')}
                      >
                        Confirmed
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};