import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Contrat {
  id: string;
  locataire_id: string;
  bien_id: string;
  loyer_mensuel: number;
  date_debut: string;
  locataires: {
    nom: string;
    telephone: string;
    email: string | null;
  };
  biens: {
    nom: string;
  };
}

interface Paiement {
  mois_concerne: string;
  montant: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting overdue rent check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current date info
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
    const currentDay = now.getDate();

    console.log(`Checking for overdue rents on ${now.toISOString()}`);
    console.log(`Current month: ${currentMonth}, Day: ${currentDay}`);

    // Get all active contracts
    const { data: contratsActifs, error: contratsError } = await supabase
      .from("contrats")
      .select(`
        id,
        locataire_id,
        bien_id,
        loyer_mensuel,
        date_debut,
        locataires(nom, telephone, email),
        biens(nom)
      `)
      .eq("statut", "actif");

    if (contratsError) {
      console.error("Error fetching contracts:", contratsError);
      throw contratsError;
    }

    console.log(`Found ${contratsActifs?.length || 0} active contracts`);

    let notificationsCreated = 0;
    const results = [];

    // Check each contract for overdue payments
    for (const contrat of (contratsActifs as unknown as Contrat[]) || []) {
      console.log(`Checking contract for locataire: ${contrat.locataires.nom}`);

      // Get payments for current month
      const { data: paiementsMois, error: paiementsError } = await supabase
        .from("paiements")
        .select("mois_concerne, montant")
        .eq("contrat_id", contrat.id)
        .eq("type", "loyer")
        .gte("mois_concerne", `${currentMonth}-01`)
        .lte("mois_concerne", `${currentMonth}-31`);

      if (paiementsError) {
        console.error(`Error fetching payments for contract ${contrat.id}:`, paiementsError);
        continue;
      }

      // Calculate total paid for current month
      const totalPaye = (paiementsMois as Paiement[])?.reduce(
        (sum, p) => sum + parseFloat(p.montant.toString()),
        0
      ) || 0;

      const loyerDu = parseFloat(contrat.loyer_mensuel.toString());
      const estEnRetard = totalPaye < loyerDu && currentDay >= 5; // Grace period of 5 days

      console.log(`Locataire: ${contrat.locataires.nom}, Loyer dû: ${loyerDu}, Payé: ${totalPaye}, En retard: ${estEnRetard}`);

      if (estEnRetard) {
        const montantRestant = loyerDu - totalPaye;

        // Check if notification already sent this month
        const { data: notificationExistante } = await supabase
          .from("notifications")
          .select("id")
          .eq("locataire_id", contrat.locataire_id)
          .eq("type", "rappel_loyer")
          .gte("created_at", `${currentMonth}-01`)
          .lte("created_at", `${currentMonth}-31`)
          .single();

        if (!notificationExistante) {
          const message = `Rappel: Le loyer de ${loyerDu.toLocaleString()} FCFA pour ${contrat.biens.nom} est en retard. Montant restant: ${montantRestant.toLocaleString()} FCFA.`;

          // Create notification record
          const { error: notifError } = await supabase
            .from("notifications")
            .insert({
              locataire_id: contrat.locataire_id,
              type: "rappel_loyer",
              message,
              statut: "envoye",
              date_envoi: now.toISOString(),
            });

          if (notifError) {
            console.error(`Error creating notification for ${contrat.locataires.nom}:`, notifError);
          } else {
            notificationsCreated++;
            console.log(`✓ Notification created for ${contrat.locataires.nom}`);
            
            results.push({
              locataire: contrat.locataires.nom,
              bien: contrat.biens.nom,
              montantDu: loyerDu,
              montantPaye: totalPaye,
              montantRestant,
            });
          }
        } else {
          console.log(`Notification already sent this month for ${contrat.locataires.nom}`);
        }
      }
    }

    const response = {
      success: true,
      message: `Checked ${contratsActifs?.length || 0} contracts`,
      notificationsCreated,
      overdueContracts: results.length,
      details: results,
      timestamp: now.toISOString(),
    };

    console.log("Check completed:", response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in check-overdue-rents function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
