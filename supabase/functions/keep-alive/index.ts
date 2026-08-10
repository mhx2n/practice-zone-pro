import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Light read + light write so the database counts as "active"
    const { count, error } = await supabase
      .from('site_settings')
      .select('id', { count: 'exact', head: true })
    if (error) throw error

    await supabase.from('page_visits').insert({
      path: '/__keep-alive',
      session_id: `keepalive-${new Date().toISOString().slice(0, 10)}`,
    }).then(() => undefined, () => undefined)

    return new Response(
      JSON.stringify({ status: 'ok', alive: true, settings: count ?? 0, at: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
