# 🚀 Guide Rapide - Système d'Audit

## ⚡ Installation en 3 étapes

### 1️⃣ Appliquer la migration SQL

Ouvrez votre console Supabase et exécutez le fichier :
```
supabase/migrations/20260122_audit_logs.sql
```

**Comment faire ?**
1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Cliquez sur "SQL Editor" dans le menu
4. Créez une nouvelle requête
5. Copiez-collez tout le contenu du fichier `supabase/migrations/20260122_audit_logs.sql`
6. Cliquez sur "Run"

### 2️⃣ Régénérer les types TypeScript (Optionnel mais recommandé)

Pour éliminer les avertissements TypeScript :

```bash
npx supabase gen types typescript --project-id VOTRE_PROJECT_ID > src/integrations/supabase/types.ts
```

> **Note :** Remplacez `VOTRE_PROJECT_ID` par l'ID de votre projet Supabase

### 3️⃣ C'est tout ! ✅

Le système d'audit est maintenant actif. Toutes les actions seront automatiquement enregistrées.

## 📊 Accéder au Journal d'Audit

- **Via le menu :** Cliquez sur "Journal d'Audit" (icône bouclier 🛡️)
- **Via l'URL :** Allez sur `/audit-logs`

## 🎯 Fonctionnalités

✅ **Enregistrement automatique** de toutes les actions (ajout, modification, suppression)  
✅ **Filtres avancés** par table, action, utilisateur et date  
✅ **Vue détaillée** des modifications avec comparaison avant/après  
✅ **Export CSV** pour analyse externe  
✅ **Recherche rapide** par utilisateur ou ID  

## 📝 Que fait le système ?

Le système enregistre automatiquement :
- **Qui** a fait l'action (utilisateur + email)
- **Quand** l'action a été faite (date et heure exacte)
- **Quoi** a été modifié (données avant et après)
- **Où** dans quelle table (Biens, Locataires, etc.)

## 🔒 Sécurité

- Les logs sont protégés et visibles uniquement par les utilisateurs authentifiés
- Seuls les administrateurs peuvent supprimer les logs
- Les triggers fonctionnent automatiquement en arrière-plan

## ❓ Besoin d'aide ?

Consultez le fichier `AUDIT_SYSTEM_README.md` pour plus de détails.
