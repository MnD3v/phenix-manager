-- Ajout de la colonne proprietaire_id et rendre bien_id optionnel pour les dépenses
ALTER TABLE public.depenses 
ADD COLUMN IF NOT EXISTS proprietaire_id UUID REFERENCES public.proprietaires(id) ON DELETE CASCADE;

ALTER TABLE public.depenses 
ALTER COLUMN bien_id DROP NOT NULL;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_depenses_proprietaire ON public.depenses(proprietaire_id);

-- Backfill: Pour les dépenses existantes, on peux essayer de remplir proprietaire_id via bien_id
-- Mais comme c'est optionnel, on peut le faire si on veut garder la cohérence
UPDATE public.depenses d
SET proprietaire_id = b.proprietaire_id
FROM public.biens b
WHERE d.bien_id = b.id
AND d.proprietaire_id IS NULL;
