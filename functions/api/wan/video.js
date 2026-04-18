/**
 * NYXIA Z — WAN AI VIDEO GENERATION
 * Submit video generation task via NVIDIA NIM
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const prompt = body.prompt || '';
    const model = body.model || 'wan2.7-t2v';
    const resolution = body.resolution || '720p';
    const duration = body.duration || 5;
    const mode = body.mode || 't2v';
    if (!prompt) return new Response(JSON.stringify({ success: false, error: 'Prompt requis.' }), { headers: { 'Content-Type': 'application/json' } });

    const WAN_KEY = env.WAN_KEY || '';
    if (!WAN_KEY) return new Response(JSON.stringify({ success: false, error: 'WAN_KEY non configuree.' }), { headers: { 'Content-Type': 'application/json' } });

    // Generate task ID
    var taskId = 'wan-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);

    // Submit to NVIDIA API (async task)
    var apiResponse = await fetch('https://integrate.api.nvidia.com/v1/video/generate', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + WAN_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        resolution: resolution,
        duration: duration,
        mode: mode,
        image_base64: body.image_base64 || null
      })
    });

    // For now, store the task in D1 for polling
    try {
      await env.MEMORY.prepare(`CREATE TABLE IF NOT EXISTS wan_tasks (
        task_id TEXT PRIMARY KEY,
        prompt TEXT,
        model TEXT,
        status TEXT DEFAULT 'pending',
        video_url TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`).run();

      if (apiResponse.ok) {
        var data = await apiResponse.json();
        await env.MEMORY.prepare("INSERT INTO wan_tasks (task_id, prompt, model, status) VALUES (?,?,?,'pending')").bind(taskId, prompt, model).run();
        return new Response(JSON.stringify({ success: true, taskId: taskId }), { headers: { 'Content-Type': 'application/json' } });
      } else {
        await env.MEMORY.prepare("INSERT INTO wan_tasks (task_id, prompt, model, status) VALUES (?,?,?,'failed')").bind(taskId, prompt, model).run();
        return new Response(JSON.stringify({ success: false, error: 'Erreur API: ' + apiResponse.status }), { headers: { 'Content-Type': 'application/json' } });
      }
    } catch(dbErr) {
      return new Response(JSON.stringify({ success: false, error: 'Erreur DB: ' + dbErr.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  } catch(e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
