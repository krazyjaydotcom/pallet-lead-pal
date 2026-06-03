import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, User, Building, Calendar, Phone, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, BusinessContext } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  id: string;
  type: 'lead' | 'prospect' | 'booking';
  title: string;
  subtitle: string;
  status?: string;
  email?: string;
  phone?: string;
  date?: string;
}

interface UnifiedSearchProps {
  businessContext?: BusinessContext;
}

export const UnifiedSearch = ({ businessContext }: UnifiedSearchProps) => {
  const { user } = useAuth();
  const { primaryBusiness } = useUserRole();
  const context = businessContext || primaryBusiness || 'academy';
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchTerm.length > 2) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [searchTerm]);

  const performSearch = async () => {
    if (!user || searchTerm.length < 3) return;

    setLoading(true);
    try {
      const searchPattern = `%${searchTerm.toLowerCase()}%`;
      const searchResults: SearchResult[] = [];

      if (context === 'crm' || context === 'hybrid') {
        // Search leads for CRM business
        const { data: leads } = await supabase
          .from('leads')
          .select('id, name, company, email, phone, status, created_at')
          .eq('user_id', user.id)
          .or(`name.ilike.${searchPattern},company.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`)
          .limit(5);

        leads?.forEach(lead => {
          searchResults.push({
            id: lead.id,
            type: 'lead',
            title: lead.name,
            subtitle: lead.company || 'No company',
            status: lead.status,
            email: lead.email,
            phone: lead.phone,
            date: lead.created_at
          });
        });
      }

      if (context === 'academy' || context === 'hybrid') {
        // Search prospects and bookings for Academy business
        const [prospects, bookings] = await Promise.all([
          supabase.from('prospects')
            .select('id, name, email, phone, status, ig_handle, created_at')
            .eq('user_id', user.id)
            .or(`name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern},ig_handle.ilike.${searchPattern}`)
            .limit(5),
          supabase.from('confirmed_bookings')
            .select('id, name, email, phone, status, created_at')
            .eq('setter_user_id', user.id)
            .or(`name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`)
            .limit(5)
        ]);

        prospects.data?.forEach(prospect => {
          searchResults.push({
            id: prospect.id,
            type: 'prospect',
            title: prospect.name,
            subtitle: prospect.ig_handle || 'No IG handle',
            status: prospect.status,
            email: prospect.email,
            phone: prospect.phone,
            date: prospect.created_at
          });
        });

        bookings.data?.forEach(booking => {
          searchResults.push({
            id: booking.id,
            type: 'booking',
            title: booking.name,
            subtitle: 'Confirmed Booking',
            status: booking.status,
            email: booking.email,
            phone: booking.phone,
            date: booking.created_at
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lead': return <Building className="w-4 h-4" />;
      case 'prospect': return <User className="w-4 h-4" />;
      case 'booking': return <Calendar className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lead': return 'bg-blue-100 text-blue-800';
      case 'prospect': return 'bg-green-100 text-green-800';
      case 'booking': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${context === 'crm' ? 'leads...' : context === 'academy' ? 'prospects, bookings...' : 'all data...'}`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {(results.length > 0 || loading) && (
        <Card className="absolute top-full mt-1 w-full z-50 max-h-96 overflow-y-auto">
          <CardContent className="p-2">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Searching...</div>
            ) : results.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No results found</div>
            ) : (
              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="p-2 rounded-md hover:bg-muted cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1">
                        <div className="mt-1">
                          {getTypeIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.title}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {result.subtitle}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {result.email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                {result.email}
                              </div>
                            )}
                            {result.phone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="w-3 h-3" />
                                {result.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={`text-xs ${getTypeColor(result.type)}`}>
                          {result.type}
                        </Badge>
                        {result.status && (
                          <Badge variant="outline" className="text-xs">
                            {result.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};