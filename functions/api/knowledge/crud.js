/**
 * NYXIA Z — KNOWLEDGE CRUD
 * GET = list all, POST = create (text or PDF), PUT = update, DELETE = delete
 * Supports PDF uploads: client extracts text, sends to API
 */
export async function onRequestGet(context) {
  const { env } = context;
  try {
    // Ensure columns exist (migration-safe)
    try {
      await env.MEMORY.prepare("ALTER TABLE knowledge ADD COLUMN type TEXT DEFAULT 'text'").run();
    } catch(e) { /* column already exists */ }
    try {
      await env.MEMORY.prepare("ALTER TABLE knowledge ADD COLUMN file_name TEXT DEFAULT ''").run();
    } catch(e) { /* column already exists */ }
    try {
      await env.MEMORY.prepare("ALTER TABLE knowledge ADD COLUMN page_count INTEGER DEFAULT 0").run();
    } catch(e) { /* column already exists */ }

    const results = await env.MEMORY.prepare('SELECT * FROM knowledge ORDER BY created_at DESC').all();
    return new Response(JSON.stringify({ success: true, items: results.results }), { headers: { 'Content-Type': 'application/json' } });
  } catch(e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const topic = body.topic || '';
    const content = body.content || '';
    const source = body.source || '';
    const tags = JSON.stringify(body.tags || []);
    const type = body.type || 'text';
    const fileName = body.fileName || '';
    const pageCount = body.pageCount || 0;
    if (!topic || !content) return new Response(JSON.stringify({ success: false, error: 'Topic et contenu requis.' }), { headers: { 'Content-Type': 'application/json' } });
    await env.MEMORY.prepare("INSERT INTO knowledge (topic, content, source, tags, type, file_name, page_count) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(topic, content, source, tags, type, fileName, pageCount).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch(e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const id = body.id;
    const topic = body.topic || '';
    const content = body.content || '';
    const source = body.source || '';
    const tags = JSON.stringify(body.tags || []);
    if (!id) return new Response(JSON.stringify({ success: false, error: 'ID requis.' }), { headers: { 'Content-Type': 'application/json' } });
    await env.MEMORY.prepare("UPDATE knowledge SET topic=?, content=?, source=?, tags=? WHERE id=?").bind(topic, content, source, tags, id).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch(e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const id = body.id;
    if (!id) return new Response(JSON.stringify({ success: false, error: 'ID requis.' }), { headers: { 'Content-Type': 'application/json' } });
    await env.MEMORY.prepare("DELETE FROM knowledge WHERE id=?").bind(id).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch(e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
