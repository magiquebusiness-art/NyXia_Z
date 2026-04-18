/**
 * ══════════════════════════════════════════
 * NYXIA Z — FACEBOOK USER DATA DELETION CALLBACK
 * Requis par Meta : quand un utilisateur supprime son compte FB
 * ou révoque l'app, Meta appelle cette URL.
 * ══════════════════════════════════════════
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();

    // Meta envoie un signed_request avec l'user_id
    var signedRequest = body.signed_request || '';

    if (!signedRequest) {
      return new Response(JSON.stringify({
        error: true,
        error_code: 1,
        message: 'Signed request manquant'
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Décoder le signed_request : payload.signature
    var parts = signedRequest.split('.');
    if (parts.length !== 2) {
      return new Response(JSON.stringify({
        error: true,
        error_code: 2,
        message: 'Format invalide'
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Décoder le payload (base64url)
    var payload = parts[1];
    payload = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';

    var decoded = JSON.parse(atob(payload));
    var userId = decoded.user_id || '';

    if (!userId) {
      return new Response(JSON.stringify({
        error: true,
        error_code: 3,
        message: 'User ID manquant'
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Supprimer les données liées à l'intégration Facebook
    await env.MEMORY.prepare(
      "UPDATE integrations SET status = 'disconnected', config = '{}', updated_at = datetime('now') WHERE name = 'facebook'"
    ).run();

    // Confirmation du code (requis par Meta)
    var confirmationCode = decoded.code || 'confirmed';

    return new Response(JSON.stringify({
      url: 'https://nyxia.travail-pour-toi.com/privacy.html',
      confirmation_code: confirmationCode,
      message: 'Donnees utilisateur supprimees avec succes'
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('[FB DELETE CALLBACK] Erreur:', e.message);
    return new Response(JSON.stringify({
      error: true,
      error_code: 100,
      message: 'Erreur serveur'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// GET requis par Meta pour vérifier que l'URL est active
export async function onRequestGet(context) {
  return new Response(JSON.stringify({
    status: 'active',
    message: 'Data Deletion Callback endpoint is live'
  }), { headers: { 'Content-Type': 'application/json' } });
}
