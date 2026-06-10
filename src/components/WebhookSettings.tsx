import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, RefreshCw } from "lucide-react";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

export const WebhookSettings = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data } = await supabase
      .from("webhook_tokens")
      .select("token")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (data) {
      setToken(data.token);
    } else {
      const { data: created, error } = await supabase
        .from("webhook_tokens")
        .insert({ user_id: userData.user.id })
        .select("token")
        .single();
      if (error) toast.error("Failed to create token");
      else setToken(created.token);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const regenerate = async () => {
    if (!confirm("Regenerate the webhook token? Your current Swipe Pages URL will stop working until you update it.")) return;
    setRegenerating(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    // generate via DB default by deleting + reinserting
    await supabase.from("webhook_tokens").delete().eq("user_id", userData.user.id);
    const { data, error } = await supabase
      .from("webhook_tokens")
      .insert({ user_id: userData.user.id })
      .select("token")
      .single();
    setRegenerating(false);
    if (error) toast.error("Failed to regenerate");
    else {
      setToken(data.token);
      toast.success("New token generated");
    }
  };

  const url = token
    ? `https://${PROJECT_ID}.supabase.co/functions/v1/intake-webhook?token=${token}`
    : "";

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Swipe Pages Webhook</CardTitle>
        <CardDescription>
          Paste this URL into Swipe Pages → Form → Integrations → Webhook. New form submissions create or merge leads automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input readOnly value={url} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copy(url, "URL")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Method: POST · Content-Type: application/json or form-encoded
              </p>
            </div>

            <div className="space-y-2">
              <Label>Token</Label>
              <div className="flex gap-2">
                <Input readOnly value={token || ""} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copy(token || "", "Token")}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={regenerate} disabled={regenerating}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep this secret. Anyone with the URL can submit leads to your CRM.
              </p>
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              <p className="mb-1 font-semibold">Recognized fields (Swipe Pages labels):</p>
              <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                <li>Name of Contact / Name</li>
                <li>Company Name</li>
                <li>Email</li>
                <li>Phone</li>
                <li>Which is your need? (delivery / pickup / both)</li>
                <li>Do you have a forklift driver?</li>
                <li>How Many Pallets Per Week?</li>
                <li>page, date (optional)</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
