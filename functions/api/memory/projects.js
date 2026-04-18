/**
 * ══════════════════════════════════════════
 * NYXIA Z — PROJECTS API
 * GET    : Liste tous les projets
 * POST   : Crée / modifie / supprime un projet
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

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    var action = body.action || '';

    // ── Créer un nouveau projet ──
    if (action === 'create') {
      var name = (body.name || '').trim();
      var domain = (body.domain || '').trim();
      var description = (body.description || '').trim();
      var techStack = body.tech_stack || [];

      if (!name) {
        return new Response(JSON.stringify({ success: false, error: 'Le nom du projet est requis' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      var id = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

      await env.MEMORY.prepare(
        'INSERT INTO projects (id, name, repo_url, domain, status, description, tech_stack, last_session) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
      ).bind(
        id,
        name,
        body.repo_url || '',
        domain,
        body.status || 'active',
        description,
        JSON.stringify(techStack)
      ).run();

      return new Response(JSON.stringify({ success: true, message: 'Projet créé', id: id }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── Modifier un projet ──
    if (action === 'update') {
      var id = body.id || '';
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: 'ID manquant' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      var sets = [];
      var binds = [];

      if (body.name !== undefined) { sets.push('name = ?'); binds.push(body.name.trim()); }
      if (body.domain !== undefined) { sets.push('domain = ?'); binds.push(body.domain.trim()); }
      if (body.description !== undefined) { sets.push('description = ?'); binds.push(body.description.trim()); }
      if (body.repo_url !== undefined) { sets.push('repo_url = ?'); binds.push(body.repo_url.trim()); }
      if (body.status !== undefined) { sets.push('status = ?'); binds.push(body.status); }
      if (body.tech_stack !== undefined) { sets.push('tech_stack = ?'); binds.push(JSON.stringify(body.tech_stack)); }
      sets.push("last_session = datetime('now')");

      if (sets.length <= 1) {
        return new Response(JSON.stringify({ success: false, error: 'Rien a modifier' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      binds.push(id);
      await env.MEMORY.prepare(
        'UPDATE projects SET ' + sets.join(', ') + ' WHERE id = ?'
      ).bind.apply(null, binds).run();

      return new Response(JSON.stringify({ success: true, message: 'Projet modifié' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── Supprimer un projet ──
    if (action === 'delete') {
      var id = body.id || '';
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: 'ID manquant' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await env.MEMORY.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();

      return new Response(JSON.stringify({ success: true, message: 'Projet supprimé' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Action inconnue' }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error('[PROJECTS POST] Erreur:', e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
