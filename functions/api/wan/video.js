/**
 * NYXIA Z — WAN AI VIDEO GENERATION via DashScope
 * Soumet une tache de generation video (T2V ou I2V) — async
 * Endpoint: POST https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis
 * Header obligatoire: X-DashScope-Async: enable
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const prompt = body.prompt || '';
    const model = body.model || 'wan2.6-t2v';
    const size = body.size || '1280*720';
    const duration = body.duration || 5;
    const mode = body.mode || 't2v';
    const img_url = body.img_url || null;

    if (!prompt && mode !== 't2v') return new Response(JSON.stringify({ success: false, error: 'Prompt requis.' }), { headers: { 'Content-Type': 'application/json' } });
    if (mode === 't2v' && !prompt) return new Response(JSON.stringify({ success: false, error: 'Prompt requis.' }), { headers: { 'Content-Type': 'application/json' } });

    const DASHSCOPE_KEY = env.DASHSCOPE_KEY || '';
    if (!DASHSCOPE_KEY) return new Response(JSON.stringify({ success: false, error: 'DASHSCOPE_KEY non configuree.' }), { headers: { 'Content-Type': 'application/json' } });

    // Construire le payload selon le mode (T2V ou I2V)
    var payload;
    if (mode === 'i2v' && img_url) {
      // Image -> Video: utilise "resolution" au format "720P" et "img_url"
      payload = {
        model: model,
        input: {
          prompt: prompt,
          img_url: img_url
        },
        parameters: {
          resolution: size,
          prompt_extend: true,
          watermark: false,
          duration: duration
        }
      };
    } else {
      // Texte -> Video: utilise "size" au format "1280*720"
      payload = {
        model: model,
        input: {
          prompt: prompt
        },
        parameters: {
          size: size,
          prompt_extend: true,
          watermark: false,
          duration: duration
        }
      };
    }

    console.log('[WAN-VIDEO] Soumission:', model, mode, size, duration);

    var apiResponse = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + DASHSCOPE_KEY,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable'
      },
      body: JSON.stringify(payload)
    });

    var data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error('[WAN-VIDEO] Erreur API:', apiResponse.status, JSON.stringify(data));
      return new Response(JSON.stringify({ success: false, error: 'Erreur API DashScope: ' + apiResponse.status + (data.message ? ' - ' + data.message : '') }), { headers: { 'Content-Type': 'application/json' } });
    }

    // DashScope retourne un taskId dans output.task_id ou output.task_status
    var taskId = (data.output && data.output.task_id) || '';

    if (!taskId) {
      console.error('[WAN-VIDEO] Pas de taskId dans la reponse:', JSON.stringify(data));
      return new Response(JSON.stringify({ success: false, error: 'Pas de taskId recu de DashScope.' }), { headers: { 'Content-Type': 'application/json' } });
    }

    console.log('[WAN-VIDEO] TaskId recu:', taskId);

    return new Response(JSON.stringify({
      success: true,
      taskId: taskId,
      status: (data.output && data.output.task_status) || 'PENDING'
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch(e) {
    console.error('[WAN-VIDEO] Exception:', e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
