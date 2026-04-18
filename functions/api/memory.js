/**
 * ══════════════════════════════════════════
 * NYXIA Z — MEMORY API
 * Retourne la mémoire complète
 * ══════════════════════════════════════════
 */

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const rules = await env.MEMORY.prepare(
      'SELECT * FROM nyxia_rules ORDER BY priority DESC, id ASC'
    ).all();

    const profile = await env.MEMORY.prepare(
      'SELECT * FROM diane_profile WHERE id = 1'
    ).first();

    const knowledge = await env.MEMORY.prepare(
      'SELECT * FROM knowledge ORDER BY created_at DESC LIMIT 20'
    ).all();

    return new Response(JSON.stringify({
      rules: rules.results || [],
      profile: profile || null,
      knowledge: knowledge.results || []
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('[MEMORY] Erreur:', e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
