import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper para formatar a data como YYYY-MM-DD
const formatDate = (date: Date) => date.toISOString().split('T')[0];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Segurança: Verifique se a requisição veio de uma fonte confiável (ex: pg_cron)
    const syncSecret = Deno.env.get('SYNC_SECRET');
    const authHeader = req.headers.get('Authorization');
    if (!syncSecret || authHeader !== `Bearer ${syncSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Determine o período da busca
    const { start_date, end_date } = await req.json();
    if (!start_date || !end_date) {
      return new Response(JSON.stringify({ error: 'start_date and end_date are required' }), { status: 400, headers: corsHeaders });
    }

    // 3. Lógica de busca (reutilizada da função anterior)
    const businessUnits = ["43", "47", "48"];
    const cpsUrls = businessUnits.map(unit => 
      `https://api-lab.my-world.dev.br/cps/list-cps?start_date=${start_date}&end_date=${end_date}&type_cps=INT&type_group=CPS&business_unit=${unit}`
    );
    const endoscopiaUrl = `https://api-lab.my-world.dev.br/cps/list-cps?start_date=${start_date}&end_date=${end_date}&type_cps=ALL&type_group=ENDOSCOPIA`;
    const allUrls = [...cpsUrls, endoscopiaUrl];

    const fetchPromises = allUrls.map(url => fetch(url));
    const settledResponses = await Promise.allSettled(fetchPromises);

    const successfulResults: any[] = [];
    for (const result of settledResponses) {
      if (result.status === 'fulfilled' && result.value.ok) {
        try {
          const data = await result.value.json();
          if (Array.isArray(data)) successfulResults.push(...data);
        } catch (e) {
          console.error(`Failed to parse JSON from ${result.value.url}:`, e);
        }
      }
    }
    
    const uniqueData = Array.from(new Map(successfulResults.map(item => [item.CPS, item])).values());

    if (uniqueData.length === 0) {
      return new Response(JSON.stringify({ message: "No new records to sync." }), { status: 200, headers: corsHeaders });
    }

    // 4. Formate e salve os dados no banco local
    const recordsToUpsert = uniqueData.map(record => ({
      cps_id: record.CPS,
      patient: record.PATIENT,
      professional: record.PROFESSIONAL,
      agreement: record.AGREEMENT,
      business_unit: record.UNIDADENEGOCIO,
      created_at: record.CREATED_AT,
    }));

    const { error: upsertError } = await supabaseAdmin
      .from('local_cps_records')
      .upsert(recordsToUpsert, { onConflict: 'cps_id' });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ message: `Successfully synced ${uniqueData.length} records.` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in sync-cps-records function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});