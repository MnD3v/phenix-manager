-- Create table for report history
CREATE TABLE public.rapports_historique (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mois_concerne TEXT NOT NULL,
  date_generation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_revenus NUMERIC NOT NULL DEFAULT 0,
  total_depenses NUMERIC NOT NULL DEFAULT 0,
  benefice_net NUMERIC NOT NULL DEFAULT 0,
  donnees_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rapports_historique ENABLE ROW LEVEL SECURITY;

-- Public access policies (internal app)
CREATE POLICY "Public can view rapports_historique" 
ON public.rapports_historique 
FOR SELECT 
USING (true);

CREATE POLICY "Public can insert rapports_historique" 
ON public.rapports_historique 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public can delete rapports_historique" 
ON public.rapports_historique 
FOR DELETE 
USING (true);