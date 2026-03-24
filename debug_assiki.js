import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zkfdfjyuwfylggqjtdhp.supabase.co';
const supabaseKey = 'sb_publishable_IiZ1AwKWizXETtw8jlAzAg_I79iRtgZ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // 1. Find Assiki
    const { data: props, error: errProp } = await supabase
        .from('proprietaires')
        .select('*')
        .ilike('nom', '%Assiki%');

    if (errProp) {
        console.error('Error fetching proprietaire:', errProp);
        return;
    }

    if (props.length === 0) {
        console.log('No proprietaire found matching "Assiki"');
        return;
    }

    const assiki = props[0];
    console.log('Found Assiki:', assiki.id, assiki.nom);

    // 2. Find Biens for Assiki
    const { data: biens, error: errBiens } = await supabase
        .from('biens')
        .select('*')
        .eq('proprietaire_id', assiki.id);

    if (errBiens) {
        console.error('Error fetching biens:', errBiens);
        return;
    }

    console.log(`Found ${biens.length} biens for Assiki.`);
    biens.forEach(b => console.log(` - [${b.id}] ${b.nom} (${b.statut})`));

    // 3. Find Contracts for these Biens
    const bienIds = biens.map(b => b.id);
    const { data: contrats, error: errContrats } = await supabase
        .from('contrats')
        .select('*, locataires(nom)')
        .in('bien_id', bienIds);

    if (errContrats) {
        console.error('Error fetching contrats:', errContrats);
        return;
    }

    console.log(`Found ${contrats.length} contracts for these biens.`);

    // 4. Check active status for Jan 2026
    const monthStart = new Date('2026-01-01');
    const monthEnd = new Date('2026-01-31');

    const isContratActif = (c) => {
        const debut = new Date(c.date_debut);
        const fin = c.date_fin ? new Date(c.date_fin) : null;
        // console.log(`Checking contract ${c.id}: ${debut.toISOString()} <= ${monthEnd.toISOString()} && (!${fin} || ${fin?.toISOString()} >= ${monthStart.toISOString()})`);
        return debut <= monthEnd && (!fin || fin >= monthStart);
    };

    biens.forEach(b => {
        const activeContrats = contrats.filter(c => c.bien_id === b.id && isContratActif(c));
        if (activeContrats.length > 0) {
            console.log(`Bien ${b.nom} is OCCUPIED by: ${activeContrats.map(c => c.locataires?.nom).join(', ')}`);
            activeContrats.forEach(c => {
                console.log(`   Contract: ${c.id} Start: ${c.date_debut} End: ${c.date_fin}`);
            });
        } else {
            console.log(`Bien ${b.nom} is FREE (No active contract found for Jan 2026)`);
            // Check if there are ANY contracts for this bien
            const anyContrats = contrats.filter(c => c.bien_id === b.id);
            if (anyContrats.length > 0) {
                console.log(`   But has contracts outside period:`);
                anyContrats.forEach(c => console.log(`     - ${c.locataires?.nom}: ${c.date_debut} to ${c.date_fin}`));
            } else {
                console.log(`   No contracts found at all.`);
            }
        }
    });
}

run();
