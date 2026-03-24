# Système d'Audit - Installation

Ce document explique comment installer et configurer le système d'audit pour l'application phenix Immobilier.

## Fonctionnalités

Le système d'audit enregistre automatiquement :
- ✅ Toutes les **insertions** (ajouts)
- ✅ Toutes les **modifications** (mises à jour)
- ✅ Toutes les **suppressions**

Pour les tables suivantes :
- Biens
- Propriétaires
- Locataires
- Contrats
- Paiements
- Dépenses

Chaque log contient :
- L'action effectuée (INSERT/UPDATE/DELETE)
- L'utilisateur qui a effectué l'action
- L'email de l'utilisateur
- La date et l'heure exacte
- Les données avant modification (pour UPDATE et DELETE)
- Les données après modification (pour INSERT et UPDATE)

## Installation

### Étape 1 : Appliquer la migration SQL

Vous devez exécuter le fichier de migration SQL dans votre base de données Supabase.

**Option A : Via l'interface Supabase (Recommandé)**

1. Connectez-vous à votre projet Supabase : https://app.supabase.com
2. Allez dans l'onglet **SQL Editor**
3. Créez une nouvelle requête
4. Copiez tout le contenu du fichier `supabase/migrations/20260122_audit_logs.sql`
5. Collez-le dans l'éditeur SQL
6. Cliquez sur **Run** pour exécuter la migration

**Option B : Via Supabase CLI**

Si vous avez installé Supabase CLI :

```bash
# Assurez-vous d'être dans le répertoire du projet
cd d:\EquilibreApp\Web\phenix\phenix-property-manager-81

# Appliquez la migration
supabase db push
```

### Étape 2 : Régénérer les types TypeScript

Après avoir appliqué la migration, vous devez régénérer les types TypeScript pour que la table `audit_logs` soit reconnue.

**Option A : Via Supabase CLI (Recommandé)**

```bash
# Régénérer les types
npx supabase gen types typescript --project-id VOTRE_PROJECT_ID > src/integrations/supabase/types.ts
```

Remplacez `VOTRE_PROJECT_ID` par l'ID de votre projet Supabase (visible dans les paramètres du projet).

**Option B : Manuellement**

1. Allez dans votre projet Supabase
2. Paramètres → API → Project URL (notez l'ID du projet dans l'URL)
3. Exécutez la commande ci-dessus avec votre ID de projet

### Étape 3 : Redémarrer le serveur de développement

```bash
# Arrêtez le serveur actuel (Ctrl+C)
# Puis redémarrez-le
npm run dev
```

## Utilisation

### Accéder au Journal d'Audit

Une fois l'installation terminée, vous pouvez accéder au journal d'audit via :

1. Le menu de navigation : **Journal d'Audit** (icône bouclier)
2. L'URL directe : `/audit-logs`

### Fonctionnalités de l'interface

- **Recherche** : Recherchez par utilisateur, table ou ID d'enregistrement
- **Filtres** :
  - Par table (Biens, Propriétaires, etc.)
  - Par action (Ajout, Modification, Suppression)
  - Par date
- **Vue détaillée** : Cliquez sur l'icône œil pour voir les détails complets d'une action
- **Export CSV** : Exportez les logs filtrés au format CSV

### Exemple de logs

**Ajout d'un bien** :
```
Date/Heure: 22/01/2026 14:30:45
Table: Biens
Action: Ajout
Utilisateur: admin@phenix.com
```

**Modification d'un locataire** :
```
Date/Heure: 22/01/2026 15:15:20
Table: Locataires
Action: Modification
Utilisateur: gestionnaire@phenix.com
Champs modifiés:
  - telephone: "92 18 40 65" → "92 18 40 66"
  - email: "ancien@email.com" → "nouveau@email.com"
```

**Suppression d'un paiement** :
```
Date/Heure: 22/01/2026 16:00:10
Table: Paiements
Action: Suppression
Utilisateur: admin@phenix.com
```

## Sécurité

- ✅ Les logs sont protégés par Row Level Security (RLS)
- ✅ Seuls les utilisateurs authentifiés peuvent voir les logs
- ✅ Seuls les administrateurs peuvent supprimer les logs
- ✅ Les triggers s'exécutent avec SECURITY DEFINER pour garantir l'intégrité

## Maintenance

### Nettoyage des anciens logs

Pour éviter que la table ne devienne trop volumineuse, vous pouvez créer une tâche planifiée pour supprimer les anciens logs :

```sql
-- Supprimer les logs de plus de 6 mois
DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '6 months';
```

### Désactiver l'audit pour une table

Si vous souhaitez désactiver l'audit pour une table spécifique :

```sql
-- Exemple : désactiver l'audit pour la table "notifications"
DROP TRIGGER IF EXISTS audit_notifications_trigger ON public.notifications;
```

### Réactiver l'audit pour une table

```sql
-- Exemple : réactiver l'audit pour la table "notifications"
CREATE TRIGGER audit_notifications_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
```

## Dépannage

### Erreur : "Table audit_logs does not exist"

➡️ Vous n'avez pas encore appliqué la migration SQL. Suivez l'Étape 1.

### Erreur TypeScript : "audit_logs is not assignable"

➡️ Vous devez régénérer les types TypeScript. Suivez l'Étape 2.

### Les logs ne s'enregistrent pas

1. Vérifiez que les triggers sont bien créés :
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE 'audit_%';
```

2. Vérifiez que la fonction existe :
```sql
SELECT * FROM pg_proc WHERE proname = 'audit_trigger_func';
```

### L'utilisateur n'est pas enregistré dans les logs

➡️ Assurez-vous que l'utilisateur est bien authentifié via Supabase Auth. Les actions effectuées sans authentification seront enregistrées avec "Système" comme utilisateur.

## Support

Pour toute question ou problème, consultez :
- La documentation Supabase : https://supabase.com/docs
- Le code source : `src/pages/AuditLogs.tsx`
- La migration SQL : `supabase/migrations/20260122_audit_logs.sql`
