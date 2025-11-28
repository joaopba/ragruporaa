import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { id, firstName, lastName, role } = await req.json();

    if (!id || !role) {
      return new Response(JSON.stringify({ error: 'ID do usuário e permissão são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Etapa 1: Atualizar os metadados no auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      { user_metadata: { first_name: firstName, last_name: lastName } }
    );

    if (authError) throw authError;

    // Etapa 2: Atualizar a permissão na tabela public.profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        first_name: firstName,
        last_name: lastName,
        role: role 
      })
      .eq('id', id);

    if (profileError) throw profileError;

    return new Response(JSON.stringify({ message: "Usuário atualizado com sucesso!" }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});