import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, Share2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ShareToken {
  id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

interface ShareLinkDialogProps {
  kpiType: 'setter' | 'closer' | 'csm';
}

export const ShareLinkDialog = ({ kpiType }: ShareLinkDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shareTokens, setShareTokens] = useState<ShareToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadShareTokens = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('kpi_share_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('kpi_type', kpiType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShareTokens(data || []);
    } catch (error) {
      console.error('Error loading share tokens:', error);
    }
  };

  useEffect(() => {
    if (open) {
      loadShareTokens();
    }
  }, [open, user, kpiType]);

  const generateShareLink = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kpi_share_tokens')
        .insert({
          user_id: user.id,
          kpi_type: kpiType,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Share link generated successfully",
      });

      loadShareTokens();
    } catch (error) {
      console.error('Error generating share link:', error);
      toast({
        title: "Error",
        description: "Failed to generate share link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/kpi/${kpiType}/${token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied",
      description: "Share link copied to clipboard",
    });
  };

  const deleteToken = async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from('kpi_share_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Share link deleted successfully",
      });

      loadShareTokens();
    } catch (error) {
      console.error('Error deleting token:', error);
      toast({
        title: "Error",
        description: "Failed to delete share link",
        variant: "destructive",
      });
    }
  };

  const getKpiTypeLabel = () => {
    switch (kpiType) {
      case 'setter': return 'Setter';
      case 'closer': return 'Closer';
      case 'csm': return 'CSM';
      default: return 'KPI';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="w-4 h-4 mr-2" />
          Share Link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share {getKpiTypeLabel()} KPI Entry Link</DialogTitle>
          <DialogDescription>
            Generate a secure link that allows others to submit KPI data without needing to log in.
            Links expire after 30 days.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Button onClick={generateShareLink} disabled={loading} className="w-full">
            {loading ? 'Generating...' : 'Generate New Share Link'}
          </Button>

          {shareTokens.length > 0 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Active Share Links</Label>
              {shareTokens.map((token) => {
                const isExpired = new Date(token.expires_at) < new Date();
                const shareUrl = `${window.location.origin}/kpi/${kpiType}/${token.token}`;
                
                return (
                  <div key={token.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Created: {new Date(token.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Expires: {new Date(token.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Input 
                        value={shareUrl} 
                        readOnly 
                        className={isExpired ? "opacity-50" : ""}
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(token.token)}
                        disabled={isExpired}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteToken(token.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {isExpired && (
                      <p className="text-sm text-destructive">This link has expired</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};