/**
 * NYXIA Z — INTEGRATIONS CRUD
 * Uses D1 integrations table. GET = list, POST = save config
 */
export async function onRequestGet(context) {
  const { env } = context;
  try {
    var results;
    try {
      results = await env.MEMORY.prepare('SELECT * FROM integrations ORDER BY name').all();
    } catch(e) {
      // Table might not exist yet, create it
      await env.MEMORY.prepare(`CREATE TABLE IF NOT EXISTS integrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '🔗',
        status TEXT DEFAULT 'disconnected',
        config TEXT DEFAULT '{}',
        updated_at TEXT DEFAULT (datetime('now'))
      )`).run();
      // Seed default integrations
      var defaults = [
        ['google','Google Workspace','🌐','disconnected'],
        ['facebook','Facebook Pages','📘','disconnected'],
        ['tiktok','TikTok','🎵','disconnected'],
        ['manychat','ManyChat','💬','disconnected'],
        ['zapier','Zapier','⚡','disconnected'],
        ['systemeio','Systeme.io','🟣','disconnected']
      ];
      for (var d of defaults) {
        await env.MEMORY.prepare("INSERT OR IGNORE INTO integrations (name, display_name, icon, status) VALUES (?,?,?,?)").bind(d[0],d[1],d[2],d[3]).run();
      }
      results = await env.MEMORY.prepare('SELECT * FROM integrations ORDER BY name').all();
    }
    return new Response(JSON.stringify({ success: true, items: results.results }), { headers: { 'Content-Type': 'application/json' } });
  } catch(e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const name = body.name || '';
    const status = body.status || 'connected';
    const config = JSON.stringify(body.config || {});
    if (!name) return new Response(JSON.stringify({ success: false, error: 'Name requis.' }), { headers: { 'Content-Type': 'application/json' } });
    await env.MEMORY.prepare("UPDATE integrations SET status=?, config=?, updated_at=datetime('now') WHERE name=?").bind(status, config, name).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch(e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
