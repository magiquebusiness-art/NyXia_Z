/**
 * NYXIA Z — AUTH CHECK
 * Vérifie si le token de session est valide
 * Le token est stocké côté client (sessionStorage)
 * On vérifie que le secret existe (la maison est accessible)
 */

export async function onRequestPost(context) {
  const { env } = context;

  try {
    const body = await context.request.json();
    const token = body.token || '';

    if (!token) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Vérifier que la maison est configurée (HOUSE_SECRET existe)
    const houseSecret = env.HOUSE_SECRET || '';
    if (!houseSecret) {
      return new Response(JSON.stringify({ valid: false, error: 'Maison non configurée' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Vérifier le format du token (uuid-timestamp)
    const parts = token.split('-');
    if (parts.length < 2) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Vérifier que le token n'est pas trop vieux (24h max)
    const timestamp = parseInt(parts[parts.length - 1], 36);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24h
    if (now - timestamp > maxAge) {
      return new Response(JSON.stringify({ valid: false, expired: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Loguer la session dans D1
    try {
      await env.MEMORY.prepare(
        "INSERT INTO session_logs (session_date, summary, mood) VALUES (datetime('now'), 'Session active', 'connected')"
      ).run();
    } catch (e) {
      // Silent fail pour le log
    }

    return new Response(JSON.stringify({ valid: true }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ valid: false }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
