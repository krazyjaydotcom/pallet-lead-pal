import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PublicSetterKPIForm } from '@/components/PublicSetterKPIForm';
import { PublicCloserKPIForm } from '@/components/PublicCloserKPIForm';
import { PublicCSMKPIForm } from '@/components/PublicCSMKPIForm';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const PublicKPIEntry = () => {
  const { type, token } = useParams<{ type: string; token: string }>();
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      if (!token || !type) {
        setIsValidToken(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('kpi_share_tokens')
          .select('kpi_type, expires_at')
          .eq('token', token)
          .eq('kpi_type', type)
          .single();

        if (error || !data) {
          setIsValidToken(false);
        } else {
          // Check if token is expired
          const isExpired = new Date(data.expires_at) < new Date();
          setIsValidToken(!isExpired);
        }
      } catch (error) {
        console.error('Error validating token:', error);
        setIsValidToken(false);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token, type]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Validating access...</p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 flex items-center justify-center">
        <div className="container mx-auto max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This link is invalid or has expired. Please contact your administrator for a new link.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const renderForm = () => {
    switch (type) {
      case 'setter':
        return <PublicSetterKPIForm token={token!} />;
      case 'closer':
        return <PublicCloserKPIForm token={token!} />;
      case 'csm':
        return <PublicCSMKPIForm token={token!} />;
      default:
        return (
          <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 flex items-center justify-center">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Invalid KPI type. Please check your link.
              </AlertDescription>
            </Alert>
          </div>
        );
    }
  };

  return renderForm();
};

export default PublicKPIEntry;