-- Table pour enregistrer tous les logs d'audit
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data jsonb,
    new_data jsonb,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Fonction générique pour créer des logs d'audit
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id uuid;
    v_user_email text;
BEGIN
    -- Récupérer l'utilisateur actuel
    v_user_id := auth.uid();
    
    -- Récupérer l'email de l'utilisateur
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    -- INSERT
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            old_data,
            new_data,
            user_id,
            user_email
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            'INSERT',
            NULL,
            to_jsonb(NEW),
            v_user_id,
            v_user_email
        );
        RETURN NEW;
    
    -- UPDATE
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            old_data,
            new_data,
            user_id,
            user_email
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW),
            v_user_id,
            v_user_email
        );
        RETURN NEW;
    
    -- DELETE
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            old_data,
            new_data,
            user_id,
            user_email
        ) VALUES (
            TG_TABLE_NAME,
            OLD.id,
            'DELETE',
            to_jsonb(OLD),
            NULL,
            v_user_id,
            v_user_email
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer les triggers pour chaque table importante

-- Trigger pour la table biens
DROP TRIGGER IF EXISTS audit_biens_trigger ON public.biens;
CREATE TRIGGER audit_biens_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.biens
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Trigger pour la table proprietaires
DROP TRIGGER IF EXISTS audit_proprietaires_trigger ON public.proprietaires;
CREATE TRIGGER audit_proprietaires_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.proprietaires
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Trigger pour la table locataires
DROP TRIGGER IF EXISTS audit_locataires_trigger ON public.locataires;
CREATE TRIGGER audit_locataires_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.locataires
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Trigger pour la table contrats
DROP TRIGGER IF EXISTS audit_contrats_trigger ON public.contrats;
CREATE TRIGGER audit_contrats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.contrats
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Trigger pour la table paiements
DROP TRIGGER IF EXISTS audit_paiements_trigger ON public.paiements;
CREATE TRIGGER audit_paiements_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.paiements
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Trigger pour la table depenses
DROP TRIGGER IF EXISTS audit_depenses_trigger ON public.depenses;
CREATE TRIGGER audit_depenses_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.depenses
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Politiques RLS pour la table audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Seuls les utilisateurs authentifiés peuvent voir les logs
CREATE POLICY "Authenticated users can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (true);

-- Seuls les admins peuvent supprimer les logs (si nécessaire)
CREATE POLICY "Only admins can delete audit logs"
    ON public.audit_logs FOR DELETE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Commentaires pour documentation
COMMENT ON TABLE public.audit_logs IS 'Table d''audit pour tracer toutes les modifications dans la base de données';
COMMENT ON COLUMN public.audit_logs.table_name IS 'Nom de la table modifiée';
COMMENT ON COLUMN public.audit_logs.record_id IS 'ID de l''enregistrement modifié';
COMMENT ON COLUMN public.audit_logs.action IS 'Type d''action: INSERT, UPDATE ou DELETE';
COMMENT ON COLUMN public.audit_logs.old_data IS 'Données avant modification (NULL pour INSERT)';
COMMENT ON COLUMN public.audit_logs.new_data IS 'Données après modification (NULL pour DELETE)';
COMMENT ON COLUMN public.audit_logs.user_id IS 'ID de l''utilisateur ayant effectué l''action';
COMMENT ON COLUMN public.audit_logs.user_email IS 'Email de l''utilisateur ayant effectué l''action';
COMMENT ON COLUMN public.audit_logs.created_at IS 'Date et heure de l''action';
