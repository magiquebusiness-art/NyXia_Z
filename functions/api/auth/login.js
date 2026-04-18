/**
 * NYXIA Z — AUTH LOGIN (v2)
 * Vérifie le mot de passe via D1 house_auth + fallback HOUSE_SECRET
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const password = body.password || '';

    if (!password) {
      return new Response(JSON.stringify({ success: false, error: 'Mot de passe requis.' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    var authenticated = false;
    var d1HasPassword = false;

    // 1. Essayer D1 house_auth en premier
    try {
      var auth = await env.MEMORY.prepare('SELECT password_hash, salt FROM house_auth WHERE id = 1').first();
      if (auth && auth.password_hash && auth.salt) {
        d1HasPassword = true;
        var hash = await hashPassword(password, auth.salt);
        if (hash === auth.password_hash) authenticated = true;
      }
    } catch (e) { /* D1 pas dispo */ }

    // 2. Fallback sur HOUSE_SECRET UNIQUEMENT si D1 est vide (initial setup)
    if (!authenticated && !d1HasPassword) {
      var houseSecret = env.HOUSE_SECRET || '';
      if (houseSecret && password === houseSecret) {
        authenticated = true;
        // Migrer vers D1 automatiquement
        try {
          var salt = crypto.randomUUID().replace(/-/g, '');
          var hash = await hashPassword(password, salt);
          await env.MEMORY.prepare(
            'INSERT OR REPLACE INTO house_auth (id, password_hash, salt, updated_at) VALUES (1, ?, ?, datetime(\'now\'))'
          ).bind(hash, salt).run();
        } catch (e) { /* silent */ }
      }
    }

    if (!authenticated) {
      return new Response(JSON.stringify({ success: false, error: 'Mot de passe incorrect.' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    var token = crypto.randomUUID() + '-' + Date.now().toString(36);

    return new Response(JSON.stringify({
      success: true,
      token: token,
      message: 'Bienvenue chez toi, Diane.'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Erreur interne.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function hashPassword(password, salt) {
  var data = new TextEncoder().encode(salt + ':' + password);
  var hash = await crypto.subtle.digest('SHA-256', data);
  var arr = Array.from(new Uint8Array(hash));
  return arr.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}
