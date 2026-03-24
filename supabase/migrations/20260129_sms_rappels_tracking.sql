-- Création de la table pour tracker les envois de SMS de rappel
CREATE TABLE IF NOT EXISTS sms_rappels_envois (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locataire_id UUID NOT NULL REFERENCES locataires(id) ON DELETE CASCADE,
    mois_concerne VARCHAR(7) NOT NULL, -- Format: "2026-01"
    date_envoi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    telephone VARCHAR(20),
    message_envoye TEXT,
    statut VARCHAR(20) DEFAULT 'envoye', -- 'envoye', 'erreur'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(locataire_id, mois_concerne) -- Un seul SMS par locataire par mois
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sms_rappels_mois ON sms_rappels_envois(mois_concerne);
CREATE INDEX IF NOT EXISTS idx_sms_rappels_locataire ON sms_rappels_envois(locataire_id);

-- Commentaires
COMMENT ON TABLE sms_rappels_envois IS 'Historique des envois de SMS de rappel aux locataires en retard';
COMMENT ON COLUMN sms_rappels_envois.mois_concerne IS 'Mois pour lequel le rappel a été envoyé (format YYYY-MM)';
COMMENT ON COLUMN sms_rappels_envois.statut IS 'Statut de l''envoi: envoye ou erreur';
