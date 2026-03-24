export interface SmsBalance {
    country: string;
    solde: number;
}

export interface SmsBalanceResponse {
    code: number;
    message: string;
    information: SmsBalance[];
}

export interface LocataireEnRetard {
    locataire_id: string;
    locataire_nom: string;
    locataire_telephone: string;
    bien_nom: string;
    loyer_mensuel: number;
    mois_impaye: string[];
    nombre_mois_impaye: number;
    montant_total_du: number;
}

const API_ID = "53419507";
const API_KEY = "90-N9OesulLd1LthDAkfli_KHoMVuPL7";

export const getSmsBalance = async (): Promise<SmsBalance[]> => {
    console.log("SMS API API désactivée : Simulation de solde.");
    return [
        { country: "TG", solde: 5000 }
    ];
};

export const genererMessageRappel = (locataire: LocataireEnRetard): string => {
    const moisStr = locataire.mois_impaye.length === 1
        ? `le mois de ${locataire.mois_impaye[0]}`
        : `les mois de ${locataire.mois_impaye.slice(0, -1).join(", ")} et ${locataire.mois_impaye[locataire.mois_impaye.length - 1]}`;

    const loyerFormate = locataire.loyer_mensuel.toLocaleString('fr-FR');
    const totalFormate = locataire.montant_total_du.toLocaleString('fr-FR');

    return `Bonjour ${locataire.locataire_nom}, nous vous rappelons que le loyer de ${locataire.bien_nom} (${loyerFormate} FCFA/mois) pour ${moisStr} n'a pas encore été payé. Total dû: ${totalFormate} FCFA. Vous avez encore 72h pour régler sous peine d'amende de 10%. Merci de régulariser votre situation. 
phenix IMMO - Tel: +228 92 18 40 65`;
};

export const detecterLocatairesEnRetard = async (forceDetection = false): Promise<LocataireEnRetard[]> => {
    try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: contratsActifs, error: contratsError } = await supabase
            .from("contrats")
            .select(`
        id,
        locataire_id,
        bien_id,
        date_debut,
        date_fin,
        loyer_mensuel,
        avance_mois,
        statut,
        locataires (
          id,
          nom,
          telephone
        ),
        biens (
          id,
          nom
        )
      `)
            .eq("statut", "actif")
            .returns<any[]>(); // Force le type de retour pour éviter l'inférence profonde

        if (contratsError) throw contratsError;
        if (!contratsActifs || contratsActifs.length === 0) return [];

        const { data: paiements, error: paiementsError } = await supabase
            .from("paiements")
            .select("contrat_id, locataire_id, montant, type");

        if (paiementsError) throw paiementsError;

        const locatairesEnRetard: LocataireEnRetard[] = [];
        const aujourdhui = new Date();
        const jourDuMois = aujourdhui.getDate();

        // if (jourDuMois < 10) {
        //     console.log("Pas encore le 10 du mois, vérification des retards désactivée");
        //     return [];
        // }

        // Règle stricte : Déclenché uniquement le 7 ou le 8
        if (!forceDetection && jourDuMois !== 7 && jourDuMois !== 8) {
            console.log("La détection des retards n'est active que le 7 et 8 du mois.");
            return [];
        }

        for (const contrat of contratsActifs) {
            const dateDebut = new Date(contrat.date_debut);
            const dateFin = contrat.date_fin ? new Date(contrat.date_fin) : null;
            const loyerMensuel = Number(contrat.loyer_mensuel);

            // Ignorer si loyer 0 ou null
            if (!loyerMensuel || loyerMensuel === 0) continue;

            const paiementsContrat = paiements?.filter(p => p.contrat_id === contrat.id) || [];

            // Calculer le total payé par type
            const paiementsAvance = paiementsContrat
                .filter(p => p.type === "avance")
                .reduce((sum, p) => sum + Number(p.montant), 0);

            const paiementsAutre = paiementsContrat
                .filter(p => ["loyer", "arrieres"].includes(p.type))
                .reduce((sum, p) => sum + Number(p.montant), 0);

            // Gérer les anciennes données/manquantes: si pas d'enregistrement de paiement 'avance'
            // mais que le contrat a 'avance_mois', on utilise la valeur du contrat.
            const montantAvanceContrat = (contrat.avance_mois || 0) * loyerMensuel;
            const effectiveAvance = Math.max(paiementsAvance, montantAvanceContrat);

            const montantTotalPaye = paiementsAutre + effectiveAvance;

            // Mois payés
            const moisPayes = montantTotalPaye / loyerMensuel;

            // Logique Arrieres.tsx pour les mois dus et la fin de contrat
            const isContratTermine = dateFin && dateFin < aujourdhui;
            const effectiveEndDate = isContratTermine ? dateFin : aujourdhui;

            const diffMois = (effectiveEndDate.getFullYear() - dateDebut.getFullYear()) * 12
                + (effectiveEndDate.getMonth() - dateDebut.getMonth());

            // Si le contrat est terminé, on compte le dernier mois (inclusif).
            // Si le contrat est actif, on NE compte PAS le mois en cours (loyer payé terme échu).
            const moisDus = isContratTermine ? diffMois + 1 : diffMois;

            const nbMoisArrieres = Math.max(0, moisDus - moisPayes);

            // Seuil de tolérance pour les flottants (comme dans Arrieres.tsx)
            if (nbMoisArrieres >= 0.1 && contrat.locataires?.telephone) {
                const moisImpayes: string[] = [];
                // Pour lister les mois, on part de là où on s'est arrêté de payer (entier)
                const premierMoisImpaye = new Date(dateDebut);
                premierMoisImpaye.setMonth(premierMoisImpaye.getMonth() + Math.floor(moisPayes));

                const nombreMoisALister = Math.ceil(nbMoisArrieres);

                for (let i = 0; i < nombreMoisALister; i++) {
                    const moisDate = new Date(premierMoisImpaye);
                    moisDate.setMonth(moisDate.getMonth() + i);
                    const moisLabel = moisDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
                    moisImpayes.push(moisLabel.charAt(0).toUpperCase() + moisLabel.slice(1));
                }

                locatairesEnRetard.push({
                    locataire_id: contrat.locataire_id,
                    locataire_nom: contrat.locataires.nom,
                    locataire_telephone: contrat.locataires.telephone,
                    bien_nom: contrat.biens?.nom || "Bien",
                    loyer_mensuel: loyerMensuel,
                    mois_impaye: moisImpayes,
                    nombre_mois_impaye: nbMoisArrieres,
                    montant_total_du: Math.ceil(nbMoisArrieres * loyerMensuel),
                });
            }
        }

        console.log(`${locatairesEnRetard.length} locataire(s) en retard détecté(s)`);
        return locatairesEnRetard;
    } catch (error) {
        console.error("Erreur lors de la détection des locataires en retard:", error);
        return [];
    }
};

export const envoyerSmsRappel = async (telephone: string, message: string): Promise<boolean> => {
    console.log(`[SMS DÉSACTIVÉ] Appel API simulé pour Rappel vers ${telephone}:`);
    console.log(message);
    return true; // Simule un succès
};

export const envoyerSmsConfirmationPaiement = async (
    telephone: string,
    locataireNom: string,
    nbMois: number,
    montant: number,
    descriptionMois?: string
): Promise<boolean> => {
    console.log(`[SMS DÉSACTIVÉ] Appel API simulé pour Confirmation Paiement vers ${telephone}`);
    return true; // Simule un succès
};

export const envoyerSmsBienvenue = async (
    telephone: string,
    locataireNom: string,
    caution: number,
    avanceMois: number,
    loyerMensuel: number
): Promise<boolean> => {
    console.log(`[SMS DÉSACTIVÉ] Appel API simulé pour Bienvenue vers ${telephone}`);
    return true; // Simule un succès
};

export const verrouillerSms = async (
    locataireId: string,
    telephone: string,
    message: string
): Promise<boolean> => {
    try {
        const { supabase } = await import("@/integrations/supabase/client");
        const moisActuel = new Date().toISOString().slice(0, 7);

        // On vérifie d'abord
        // @ts-ignore
        const { data: existing } = await (supabase as any)
            .from("sms_rappels_envois")
            .select("id, statut")
            .eq("locataire_id", locataireId)
            .eq("mois_concerne", moisActuel)
            .maybeSingle();

        if (existing) {
            // Si DÉJÀ traité (envoye ou erreur ou en_cours), on ne verrouille pas pour un "nouvel envoi auto".
            // Cette fonction est appelée par le process auto.
            // Si "erreur", le process auto NE DOIT PAS réessayer (One shot rule).
            // Donc si ça existe, on return false.
            console.log(`[Verrouillage] Envoi déjà tenté pour ${locataireId} (Statut: ${existing.statut}). Skip.`);
            return false;
        }

        // Insertion nouveau "en_cours"
        // @ts-ignore
        const { error } = await (supabase as any)
            .from("sms_rappels_envois")
            .insert({
                locataire_id: locataireId,
                mois_concerne: moisActuel,
                telephone: telephone,
                message_envoye: message,
                statut: 'en_cours',
            });

        if (error) return false;
        return true;
    } catch (error) {
        return false;
    }
};

export const majStatutSms = async (
    locataireId: string,
    statut: 'envoye' | 'erreur'
): Promise<void> => {
    try {
        const { supabase } = await import("@/integrations/supabase/client");
        const moisActuel = new Date().toISOString().slice(0, 7);

        // @ts-ignore
        await (supabase as any)
            .from("sms_rappels_envois")
            .update({ statut: statut })
            .eq("locataire_id", locataireId)
            .eq("mois_concerne", moisActuel);
    } catch (error) {
        console.error("Exception MAJ statut SMS:", error);
    }
};

const creerNotification = async (
    locataireId: string,
    message: string,
    statut: 'envoye' | 'erreur'
): Promise<void> => {
    try {
        const { supabase } = await import("@/integrations/supabase/client");
        const dateDebutMois = new Date();
        dateDebutMois.setDate(1);
        dateDebutMois.setHours(0, 0, 0, 0);
        const dateDebutStr = dateDebutMois.toISOString();

        const { data: existingNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("locataire_id", locataireId)
            .eq("type", "rappel_loyer")
            .gte("created_at", dateDebutStr)
            .maybeSingle();

        if (existingNotif) return;

        await supabase
            .from("notifications")
            .insert({
                locataire_id: locataireId,
                type: "rappel_loyer",
                message: message,
                statut: statut,
                canal_envoi: "sms",
                date_envoi: new Date().toISOString(),
            });
    } catch (error) {
        console.error("Exception création notification:", error);
    }
};

export const verifierEtEnvoyerRappels = async (): Promise<{
    total: number;
    envoyes: number;
    erreurs: number;
    deja_traites: number;
}> => {
    console.log("----- DÉBUT PROCESSUS RAPPELS SMS (NOUVELLE LOGIQUE BATCH) -----");

    const { supabase } = await import("@/integrations/supabase/client");
    const moisActuel = new Date().toISOString().slice(0, 7);

    // 1. Vérifier si un batch a DÉJÀ été exécuté ce mois-ci
    // On considère que si la table contient AU MOINS UN enregistrement pour ce mois (succès ou erreur),
    // c'est que le processus automatique a déjà tourné.
    // @ts-ignore
    const { count, error } = await (supabase as any)
        .from("sms_rappels_envois")
        .select("*", { count: 'exact', head: true })
        .eq("mois_concerne", moisActuel);

    if (error) {
        console.error("Erreur critique vérification batch:", error);
        return { total: 0, envoyes: 0, erreurs: 0, deja_traites: 0 };
    }

    if (count !== null && count > 0) {
        console.log(`[Batch] STOP. ${count} message(s) déjà enregistré(s) pour ${moisActuel}. Le batch mensuel ne s'exécute qu'une seule fois.`);
        return { total: 0, envoyes: 0, erreurs: 0, deja_traites: count };
    }

    // 2. Si aucun enregistrement, c'est le "Premier Run". On détecte les retards.
    const locatairesEnRetard = await detecterLocatairesEnRetard();

    if (locatairesEnRetard.length === 0) {
        // Log seulement, pas d'écriture DB, donc le batch pourra retenter
        console.log("Aucun locataire en retard à traiter.");
        return { total: 0, envoyes: 0, erreurs: 0, deja_traites: 0 };
    }

    console.log(`[Batch] Premier run du mois. ${locatairesEnRetard.length} locataires ciblés.`);

    let envoyes = 0;
    let erreurs = 0;

    // 3. Traitement de TOUTE la liste
    for (const locataire of locatairesEnRetard) {
        const message = genererMessageRappel(locataire);

        // On inscrit la tentative dans la DB.
        // C'est CETTE inscription qui bloquera les futures exécutions du batch (car count > 0).
        const peutEnvoyer = await verrouillerSms(locataire.locataire_id, locataire.locataire_telephone, message);

        if (!peutEnvoyer) continue;

        const success = await envoyerSmsRappel(locataire.locataire_telephone, message);

        if (success) {
            envoyes++;
            await majStatutSms(locataire.locataire_id, 'envoye');
            await creerNotification(locataire.locataire_id, message, 'envoye');
        } else {
            erreurs++;
            await majStatutSms(locataire.locataire_id, 'erreur');
            await creerNotification(locataire.locataire_id, message, 'erreur');
        }
    }

    return {
        total: locatairesEnRetard.length,
        envoyes,
        erreurs,
        deja_traites: 0,
    };
};

/**
 * Fonction pour relancer MANUELLEMENT les SMS qui ont échoué ce mois-ci.
 * Accessible via le bouton dans l'interface Notifications.
 */
export const relancerEchecsSms = async (): Promise<{ relances: number; erreurs: number }> => {
    console.log("----- RELANCE DES ÉCHECS / NON ENVOYÉS -----");
    const { supabase } = await import("@/integrations/supabase/client");
    const moisActuel = new Date().toISOString().slice(0, 7); // yyyy-MM

    // 1. Détecter TOUS les locataires en retard actuellement
    const locatairesEnRetard = await detecterLocatairesEnRetard(true);

    if (!locatairesEnRetard || locatairesEnRetard.length === 0) {
        console.log("Aucun locataire en retard à relancer.");
        return { relances: 0, erreurs: 0 };
    }

    // 2. Récupérer ceux qui ont DÉJÀ reçu un SMS avec succès ce mois-ci
    // @ts-ignore
    const { data: envoisReussis } = await (supabase as any)
        .from("sms_rappels_envois")
        .select("locataire_id")
        .eq("mois_concerne", moisActuel)
        .eq("statut", "envoye");

    const locatairesReussisSet = new Set(envoisReussis?.map((e: any) => e.locataire_id) || []);

    let relances = 0;
    let erreurs = 0;

    // 3. Traiter ceux qui sont en retard MAIS qui n'ont pas eu de SMS réussi ce mois-ci
    for (const locataire of locatairesEnRetard) {
        if (locatairesReussisSet.has(locataire.locataire_id)) {
            continue; // Déjà envoyé avec succès
        }

        const message = genererMessageRappel(locataire);
        console.log(`Relance/Envoi pour ${locataire.locataire_nom}...`);

        // Pour éviter les conflits d'unicité potentiels si le statut était "erreur" ou "en_cours", on le supprime d'abord
        // @ts-ignore
        await (supabase as any)
            .from("sms_rappels_envois")
            .delete()
            .eq("locataire_id", locataire.locataire_id)
            .eq("mois_concerne", moisActuel);

        // Insertion du nouveau statut 'en_cours'
        // @ts-ignore
        await (supabase as any).from("sms_rappels_envois").insert({
            locataire_id: locataire.locataire_id,
            mois_concerne: moisActuel,
            telephone: locataire.locataire_telephone,
            message_envoye: message,
            statut: 'en_cours'
        });

        const success = await envoyerSmsRappel(locataire.locataire_telephone, message);

        if (success) {
            relances++;
            await majStatutSms(locataire.locataire_id, 'envoye');
            await majNotificationStatut(locataire.locataire_id, 'envoye', message);
        } else {
            erreurs++;
            await majStatutSms(locataire.locataire_id, 'erreur');
            await majNotificationStatut(locataire.locataire_id, 'erreur', message);
        }
    }

    return { relances, erreurs };
};

const majNotificationStatut = async (locataireId: string, statut: 'envoye' | 'erreur', message: string) => {
    try {
        const { supabase } = await import("@/integrations/supabase/client");
        const dateDebutMois = startOfMonth(new Date()).toISOString();

        // On met à jour la dernière notif (celle qui était en erreur ou autre)
        const { data: notif } = await supabase
            .from("notifications")
            .select("id")
            .eq("locataire_id", locataireId)
            .eq("type", "rappel_loyer")
            .gte("created_at", dateDebutMois)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (notif) {
            await supabase
                .from("notifications")
                .update({ statut: statut, message: message })
                .eq("id", notif.id);
        } else {
            await creerNotification(locataireId, message, statut);
        }
    } catch (e) {
        console.error("Err maj notif", e);
    }
};

// Helper pour date
function startOfMonth(date: Date) {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}
