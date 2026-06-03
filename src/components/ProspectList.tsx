import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Phone, Mail, MessageCircle } from 'lucide-react';
import { Prospect } from './ProspectManager';

interface ProspectListProps {
  prospects: Prospect[];
  onUpdateStatus: (prospectId: string, status: Prospect['status'], followUpIncrement?: boolean) => void;
  onMoveToGhost?: (prospectId: string) => void;
  isGhostList?: boolean;
}

const statusColors = {
  none: 'bg-slate-500',
  '1st contact': 'bg-blue-500',
  follow_up: 'bg-yellow-500',
  training: 'bg-purple-500',
  confirmed: 'bg-green-500',
  no_response: 'bg-red-500',
  ghost: 'bg-gray-500',
};

const statusLabels = {
  none: 'No Status',
  '1st contact': '1st Contact',
  follow_up: 'Follow Up',
  training: 'Training',
  confirmed: 'Confirmed',
  no_response: 'No Response',
  ghost: 'Ghost',
};

export const ProspectList = ({ prospects, onUpdateStatus, onMoveToGhost, isGhostList = false }: ProspectListProps) => {
  if (prospects.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No prospects found in this category.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {prospects.map((prospect) => (
        <Card key={prospect.id}>
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{prospect.name}</h3>
                  <Badge className={`${statusColors[prospect.status]} text-white`}>
                    {statusLabels[prospect.status]}
                  </Badge>
                  {prospect.follow_up_count > 0 && (
                    <Badge variant="outline">
                      Follow-up #{prospect.follow_up_count}/5
                    </Badge>
                  )}
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
                  <p className="text-sm mt-2 p-2 bg-muted rounded">{prospect.notes}</p>
                )}
              </div>
              
              {!isGhostList && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {prospect.status !== 'follow_up' && prospect.follow_up_count < 5 && (
                      <DropdownMenuItem 
                        onClick={() => onUpdateStatus(prospect.id, 'follow_up', true)}
                      >
                        Follow Up ({prospect.follow_up_count + 1}/5)
                      </DropdownMenuItem>
                    )}
                    {prospect.status !== 'training' && (
                      <DropdownMenuItem 
                        onClick={() => onUpdateStatus(prospect.id, 'training')}
                      >
                        Mark as Training
                      </DropdownMenuItem>
                    )}
                    {prospect.status !== 'confirmed' && (
                      <DropdownMenuItem 
                        onClick={() => onUpdateStatus(prospect.id, 'confirmed')}
                      >
                        Mark as Confirmed
                      </DropdownMenuItem>
                    )}
                    {onMoveToGhost && (
                      <DropdownMenuItem 
                        onClick={() => onMoveToGhost(prospect.id)}
                        className="text-red-600"
                      >
                        Move to Ghost List
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};