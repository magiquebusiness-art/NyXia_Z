/**
 * ══════════════════════════════════════════
 * NYXIA Z — FACEBOOK PUBLISH API
 * POST : Publier sur la Page Facebook de Diane
 * GET  : Lister les publications planifiees
 * ══════════════════════════════════════════
 */

export async function onRequestGet(context) {
  const { env } = context;
  try {
    // Récupérer les publications planifiées
    var scheduled = await env.MEMORY.prepare(
      "SELECT * FROM fb_scheduled_posts ORDER BY scheduled_at ASC"
    ).all();
    return new Response(JSON.stringify({
      success: true,
      posts: (scheduled.results || []).map(function(p) {
        return {
          id: p.id,
          message: p.message,
          image_url: p.image_url || '',
          scheduled_at: p.scheduled_at,
          status: p.status,
          created_at: p.created_at,
          fb_post_id: p.fb_post_id || ''
        };
      })
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    var body = await request.json();
    var action = body.action || 'publish';

    // Récupérer le token depuis la config Facebook
    var intRow = await env.MEMORY.prepare(
      "SELECT config FROM integrations WHERE name = 'facebook'"
    ).first();

    if (!intRow || !intRow.config) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Facebook non connecte. Connecte ton compte dans Integrations.'
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    var config = JSON.parse(intRow.config);
    var token = config.access_token;

    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token Facebook manquant.'
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // ── PUBLICATION IMMEDIATE ──
    if (action === 'publish') {
      var message = body.message || '';
      var imageUrl = body.image_url || '';
      var pageId = body.page_id || 'me';

      if (!message && !imageUrl) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Ecris un message ou ajoute une image.'
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      var fbUrl = 'https://graph.facebook.com/v19.0/' + pageId + '/feed';
      var fbBody = { message: message, access_token: token };

      // Si image, d'abord uploader puis publier avec l'ID de l'image
      if (imageUrl) {
        // Upload photo
        var uploadUrl = 'https://graph.facebook.com/v19.0/' + pageId + '/photos';
        var uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: imageUrl,
            message: message,
            access_token: token
          })
        });
        var uploadData = await uploadRes.json();

        if (!uploadData.id) {
          return new Response(JSON.stringify({
            success: false,
            error: uploadData.error ? uploadData.error.message : 'Erreur upload image Facebook'
          }), { headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Photo publiee sur Facebook !',
          fb_post_id: uploadData.id
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      // Post texte seulement
      var fbRes = await fetch(fbUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fbBody)
      });
      var fbData = await fbRes.json();

      if (!fbData.id) {
        return new Response(JSON.stringify({
          success: false,
          error: fbData.error ? fbData.error.message : 'Erreur publication Facebook'
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Publie sur Facebook !',
        fb_post_id: fbData.id
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // ── PLANIFIER UNE PUBLICATION ──
    if (action === 'schedule') {
      var message = body.message || '';
      var imageUrl = body.image_url || '';
      var scheduledAt = body.scheduled_at || '';

      if (!message && !imageUrl) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Ecris un message ou ajoute une image.'
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      if (!scheduledAt) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Choisis une date et heure de publication.'
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      // S'assurer que la table existe
      try {
        await env.MEMORY.prepare(`CREATE TABLE IF NOT EXISTS fb_scheduled_posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message TEXT DEFAULT '',
          image_url TEXT DEFAULT '',
          scheduled_at TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          fb_post_id TEXT DEFAULT '',
          created_at TEXT DEFAULT (datetime('now'))
        )`).run();
      } catch(e) {}

      await env.MEMORY.prepare(
        "INSERT INTO fb_scheduled_posts (message, image_url, scheduled_at, status) VALUES (?, ?, ?, 'pending')"
      ).bind(message, imageUrl, scheduledAt).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Publication planifiee ! NyXia publiera automatiquement.'
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // ── SUPPRIMER UNE PUBLICATION PLANIFIEE ──
    if (action === 'delete_scheduled') {
      var id = parseInt(body.id);
      if (!id) {
        return new Response(JSON.stringify({
          success: false,
          error: 'ID manquant.'
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      try {
        await env.MEMORY.prepare(
          "CREATE TABLE IF NOT EXISTS fb_scheduled_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, message TEXT DEFAULT '', image_url TEXT DEFAULT '', scheduled_at TEXT NOT NULL, status TEXT DEFAULT 'pending', fb_post_id TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')))"
        ).run();
      } catch(e) {}

      await env.MEMORY.prepare(
        'DELETE FROM fb_scheduled_posts WHERE id = ?'
      ).bind(id).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Publication supprimee.'
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Action inconnue.'
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({
      success: false,
      error: e.message
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
