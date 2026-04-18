/**
 * ══════════════════════════════════════════
 * NYXIA Z — PROJECTS API
 * ══════════════════════════════════════════
 */

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const projects = await env.MEMORY.prepare(
      'SELECT * FROM projects ORDER BY last_session DESC'
    ).all();

    return new Response(JSON.stringify({
      projects: projects.results || []
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('[PROJECTS] Erreur:', e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
