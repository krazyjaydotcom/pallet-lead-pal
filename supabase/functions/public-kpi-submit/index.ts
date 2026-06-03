import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create Supabase client with service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { token, kpiData } = await req.json()

    if (!token || !kpiData) {
      return new Response(
        JSON.stringify({ error: 'Token and KPI data are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate token and get user info
    const { data: tokenData, error: tokenError } = await supabase
      .from('kpi_share_tokens')
      .select('user_id, kpi_type, expires_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Token has expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine the table based on KPI type
    let tableName: string
    switch (tokenData.kpi_type) {
      case 'setter':
        tableName = 'setter_kpi_entries'
        break
      case 'closer':
        tableName = 'closer_kpi_entries'
        break
      case 'csm':
        tableName = 'csm_kpi_entries'
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid KPI type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Insert the KPI data
    const { data, error } = await supabase
      .from(tableName)
      .upsert({
        user_id: tokenData.user_id,
        ...kpiData
      }, {
        onConflict: 'user_id,date'
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting KPI data:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to save KPI data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in public-kpi-submit function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})