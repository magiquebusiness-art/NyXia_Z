/**
 * NYXIA Z — WAN VIDEO via DashScope
 * Route: POST /api/wan-video
 * Attend: { prompt, model, resolution, duration, mode, image_base64 }
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const prompt = body.prompt || '';
    const model = body.model || 'wan2.6-t2v';
    const resolution = body.resolution || '720p';
    const duration = body.duration || 5;
    const mode = body.mode || 't2v';
    const imageBase64 = body.image_base64 || null;

    if (!prompt) return new Response(JSON.stringify({ success: false, error: 'Prompt requis.' }), { headers: { 'Content-Type': 'application/json' } });

    const WAN_KEY = env.WAN_KEY || '';
    if (!WAN_KEY) return new Response(JSON.stringify({ success: false, error: 'Cle API non configuree.' }), { headers: { 'Content-Type': 'application/json' } });

    // Convertir resolution (720p/1080p/480p) en format DashScope
    var sizeMap = { '480p': '856*480', '720p': '1280*720', '1080p': '1920*1080' };
    var size = sizeMap[resolution] || '1280*720';
    var resMap = { '480p': '480P', '720p': '720P', '1080p': '1080P' };

    var payload;
    if (mode === 'i2v' && imageBase64) {
      payload = {
        model: model,
        input: { prompt: prompt, img_url: imageBase64 },
        parameters: { resolution: resMap[resolution] || '720P', prompt_extend: true, watermark: false, duration: duration }
      };
    } else {
      payload = {
        model: model,
        input: { prompt: prompt },
        parameters: { size: size, prompt_extend: true, watermark: false, duration: duration }
      };
    }

    console.log('[WAN-VIDEO] Soumission:', model, mode, resolution, duration);

    var apiResponse = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + WAN_KEY, 'Content-Type': 'application/json', 'X-DashScope-Async': 'enable' },
      body: JSON.stringify(payload)
    });

    var data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error('[WAN-VIDEO] Erreur API:', apiResponse.status, JSON.stringify(data));
      return new Response(JSON.stringify({ success: false, error: 'Erreur API DashScope: ' + apiResponse.status + (data.message ? ' - ' + data.message : '') }), { headers: { 'Content-Type': 'application/json' } });
    }

    var taskId = (data.output && data.output.task_id) || '';
    if (!taskId) {
      console.error('[WAN-VIDEO] Pas de taskId:', JSON.stringify(data));
      return new Response(JSON.stringify({ success: false, error: 'Pas de taskId recu.' }), { headers: { 'Content-Type': 'application/json' } });
    }

    console.log('[WAN-VIDEO] TaskId:', taskId);
    return new Response(JSON.stringify({ success: true, taskId: taskId }), { headers: { 'Content-Type': 'application/json' } });

  } catch(e) {
    console.error('[WAN-VIDEO] Exception:', e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
