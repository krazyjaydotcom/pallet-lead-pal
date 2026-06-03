import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  Mail, 
  Clock, 
  User, 
  Building, 
  Calendar,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

interface CustomerActionCardProps {
  customer: any;
  onClick: () => void;
  variant?: 'default' | 'priority';
}

export const CustomerActionCard: React.FC<CustomerActionCardProps> = ({
  customer,
  onClick,
  variant = 'default'
}) => {
  const isPriority = variant === 'priority';
  const cardClasses = isPriority 
    ? "border-destructive/50 hover:border-destructive cursor-pointer transition-all duration-200 hover:shadow-md"
    : "hover:border-primary/50 cursor-pointer transition-all duration-200 hover:shadow-md";

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'New': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'Contacted': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'Qualified': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'Client': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'pending': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'confirmed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'completed': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lead': return <User className="h-4 w-4" />;
      case 'prospect': return <Building className="h-4 w-4" />;
      case 'booking': return <Calendar className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const formatLastContact = (lastContact: string | null) => {
    if (!lastContact) return 'Never contacted';
    const days = Math.floor((Date.now() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const getActionButton = () => {
    if (customer.priority >= 9) {
      return (
        <Button size="sm" variant="destructive" className="ml-auto">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Urgent
        </Button>
      );
    }
    
    if (customer.phone) {
      return (
        <Button size="sm" variant="secondary" className="ml-auto">
          <Phone className="h-3 w-3 mr-1" />
          Call
        </Button>
      );
    }

    if (customer.email) {
      return (
        <Button size="sm" variant="outline" className="ml-auto">
          <Mail className="h-3 w-3 mr-1" />
          Email
        </Button>
      );
    }

    return (
      <Button size="sm" variant="ghost" className="ml-auto">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Review
      </Button>
    );
  };

  return (
    <Card className={cardClasses} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Type Icon & Priority Indicator */}
            <div className="flex items-center space-x-2">
              {getTypeIcon(customer.type)}
              {isPriority && (
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              )}
            </div>

            {/* Customer Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-sm truncate">
                  {customer.name}
                </h3>
                <Badge className={`text-xs ${getStatusColor(customer.status)}`}>
                  {customer.status}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                {customer.company && (
                  <span className="flex items-center space-x-1 truncate">
                    <Building className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{customer.company}</span>
                  </span>
                )}
                
                <span className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatLastContact(customer.last_contact_date || customer.lastContact)}</span>
                </span>
              </div>

              {/* Next Action */}
              <div className="mt-2">
                <p className="text-xs font-medium text-primary">
                  {customer.nextAction}
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="ml-4 flex-shrink-0">
            {getActionButton()}
          </div>
        </div>

        {/* Contact Info Pills */}
        <div className="flex items-center space-x-2 mt-3">
          {customer.phone && (
            <Badge variant="outline" className="text-xs">
              <Phone className="h-2 w-2 mr-1" />
              Phone
            </Badge>
          )}
          {customer.email && (
            <Badge variant="outline" className="text-xs">
              <Mail className="h-2 w-2 mr-1" />
              Email
            </Badge>
          )}
          {customer.ig_handle && (
            <Badge variant="outline" className="text-xs">
              IG
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};