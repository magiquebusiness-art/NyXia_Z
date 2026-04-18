/**
 * ══════════════════════════════════════════
 * NYXIA Z — HEARTBEAT API
 * Stats de la mémoire
 * ══════════════════════════════════════════
 */

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const rulesCount = await env.MEMORY.prepare('SELECT COUNT(*) as c FROM nyxia_rules').first();
    const projectsCount = await env.MEMORY.prepare('SELECT COUNT(*) as c FROM projects').first();
    const sessionsCount = await env.MEMORY.prepare('SELECT COUNT(*) as c FROM session_logs').first();
    const knowledgeCount = await env.MEMORY.prepare('SELECT COUNT(*) as c FROM knowledge').first();

    return new Response(JSON.stringify({
      rules: rulesCount.c || 0,
      projects: projectsCount.c || 0,
      sessions: sessionsCount.c || 0,
      knowledge: knowledgeCount.c || 0
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('[HEARTBEAT] Erreur:', e.message);
    return new Response(JSON.stringify({ rules: 0, projects: 0, sessions: 0, knowledge: 0 }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
