import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase URL or Key");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log("Fetching data...");

    const { data: contratsActifs, error: contratsError } = await supabase
        .from("contrats")
        .select(`
            id, locataire_id, bien_id, date_debut, date_fin, loyer_mensuel, avance_mois, statut,
            locataires ( id, nom, telephone ),
            biens ( id, nom )
        `)
        .eq("statut", "actif");

    if (contratsError) return console.error(contratsError);

    const { data: paiements, error: paiementsError } = await supabase
        .from("paiements")
        .select("contrat_id, locataire_id, montant, type");

    if (paiementsError) return console.error(paiementsError);

    const locatairesEnRetard = [];
    const aujourdhui = new Date("2026-02-26T12:00:00Z");

    for (const contrat of contratsActifs) {
        const dateDebut = new Date(contrat.date_debut);
        const dateFin = contrat.date_fin ? new Date(contrat.date_fin) : null;
        const loyerMensuel = Number(contrat.loyer_mensuel);

        if (!loyerMensuel || loyerMensuel === 0) continue;

        const paiementsContrat = paiements?.filter(p => p.contrat_id === contrat.id) || [];
        const paiementsAvance = paiementsContrat.filter(p => p.type === "avance").reduce((sum, p) => sum + Number(p.montant), 0);
        const paiementsAutre = paiementsContrat.filter(p => ["loyer", "arrieres"].includes(p.type)).reduce((sum, p) => sum + Number(p.montant), 0);

        const montantAvanceContrat = (contrat.avance_mois || 0) * loyerMensuel;
        const effectiveAvance = Math.max(paiementsAvance, montantAvanceContrat);

        const montantTotalPaye = paiementsAutre + effectiveAvance;
        const moisPayes = montantTotalPaye / loyerMensuel;

        const isContratTermine = dateFin && dateFin < aujourdhui;
        const effectiveEndDate = isContratTermine ? dateFin : aujourdhui;

        const diffMois = (effectiveEndDate.getFullYear() - dateDebut.getFullYear()) * 12 + (effectiveEndDate.getMonth() - dateDebut.getMonth());
        const moisDus = isContratTermine ? diffMois + 1 : diffMois;
        const nbMoisArrieres = Math.max(0, moisDus - moisPayes);

        if (nbMoisArrieres >= 0.1) {
            locatairesEnRetard.push({
                nom: contrat.locataires.nom, date_debut: contrat.date_debut,
                moisDus, moisPayes, diffMois, nbMoisArrieres
            });
        }
    }

    console.log(`Found ${locatairesEnRetard.length} in arrears on Feb 26...`);
    console.log(JSON.stringify(locatairesEnRetard.slice(0, 3), null, 2));

    const { data: smsData } = await supabase.from('sms_rappels_envois').select('*').order('created_at', { ascending: false }).limit(5);
    console.log("Last 5 sms_rappels_envois:");
    console.log(JSON.stringify(smsData, null, 2));
}

run();
