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

    const { email, password, firstName, lastName, role } = await req.json();

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: 'Email, senha e permissão são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Create the user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (authError) throw authError;

    // The on_auth_user_created trigger will automatically create a profile.
    // Now, we just need to update the role on that new profile.
    const newUser = authData.user;
    if (!newUser) {
        throw new Error("Falha ao criar usuário, nenhum usuário retornado.");
    }

    // Step 2: Update the role in the public.profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role: role })
      .eq('id', newUser.id);

    if (profileError) throw profileError;

    return new Response(JSON.stringify({ message: "Usuário criado com sucesso!" }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});