
-- Webhook tokens per user (for Swipe Pages and any external intake)
CREATE TABLE public.webhook_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_tokens TO authenticated;
GRANT ALL ON public.webhook_tokens TO service_role;

ALTER TABLE public.webhook_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own webhook token"
  ON public.webhook_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_webhook_tokens_updated_at
  BEFORE UPDATE ON public.webhook_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Email <-> lead links for the inbox view
CREATE TABLE public.email_lead_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id TEXT NOT NULL,
  thread_id TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  action TEXT NOT NULL DEFAULT 'linked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_lead_links TO authenticated;
GRANT ALL ON public.email_lead_links TO service_role;

ALTER TABLE public.email_lead_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own email links"
  ON public.email_lead_links FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
