/**
 * NYXIA Z — CHANGE PASSWORD
 * Change le mot de passe de la maison (nécessite l'ancien)
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    var token = request.headers.get('X-Nyxia-Token') || '';
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Non autorise.' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    var body = await request.json();
    var currentPassword = body.currentPassword || '';
    var newPassword = body.newPassword || '';

    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ success: false, error: 'Les deux mots de passe sont requis.' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ success: false, error: 'Le nouveau mot de passe doit faire au moins 6 caracteres.' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Vérifier l'ancien mot de passe
    var authenticated = false;

    // Check D1
    try {
      var auth = await env.MEMORY.prepare('SELECT password_hash, salt FROM house_auth WHERE id = 1').first();
      if (auth && auth.password_hash && auth.salt) {
        var hash = await hashPassword(currentPassword, auth.salt);
        if (hash === auth.password_hash) authenticated = true;
      }
    } catch (e) {}

    // Fallback HOUSE_SECRET
    if (!authenticated) {
      var houseSecret = env.HOUSE_SECRET || '';
      if (houseSecret && currentPassword === houseSecret) authenticated = true;
    }

    if (!authenticated) {
      return new Response(JSON.stringify({ success: false, error: 'Ancien mot de passe incorrect.' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hasher et sauvegarder le nouveau mot de passe
    var salt = crypto.randomUUID().replace(/-/g, '');
    var newHash = await hashPassword(newPassword, salt);

    await env.MEMORY.prepare(
      "INSERT OR REPLACE INTO house_auth (id, password_hash, salt, updated_at) VALUES (1, ?, ?, datetime('now'))"
    ).bind(newHash, salt).run();

    // Loguer dans session_logs
    try {
      await env.MEMORY.prepare(
        "INSERT INTO session_logs (session_date, summary, mood) VALUES (datetime('now'), 'Mot de passe modifie', 'security')"
      ).run();
    } catch (e) {}

    return new Response(JSON.stringify({ success: true, message: 'Mot de passe modifie avec succes.' }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Erreur interne.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function hashPassword(password, salt) {
  var data = new TextEncoder().encode(salt + ':' + password);
  var hash = await crypto.subtle.digest('SHA-256', data);
  var arr = Array.from(new Uint8Array(hash));
  return arr.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}
