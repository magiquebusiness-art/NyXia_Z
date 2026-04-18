/**
 * ══════════════════════════════════════════
 * NYXIA Z — MEMORY API
 * GET  : Retourne la mémoire complète
 * POST : Ajoute / supprime une règle
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

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    var action = body.action || '';

    // Ajouter une nouvelle règle
    if (action === 'add') {
      var rule = (body.rule || '').trim();
      var priority = body.priority || 'normal';

      if (!rule) {
        return new Response(JSON.stringify({ success: false, error: 'La règle est vide' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      var allowedPriorities = ['max', 'high', 'normal', 'low'];
      if (allowedPriorities.indexOf(priority) === -1) priority = 'normal';

      await env.MEMORY.prepare(
        'INSERT INTO nyxia_rules (rule, priority) VALUES (?, ?)'
      ).bind(rule, priority).run();

      return new Response(JSON.stringify({ success: true, message: 'Règle ajoutée' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Supprimer une règle
    if (action === 'delete') {
      var id = parseInt(body.id);
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: 'ID manquant' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await env.MEMORY.prepare('DELETE FROM nyxia_rules WHERE id = ?').bind(id).run();

      return new Response(JSON.stringify({ success: true, message: 'Règle supprimée' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Action inconnue' }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error('[MEMORY POST] Erreur:', e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
