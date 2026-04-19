/**
 * NYXIA Z — WAN IMAGE via DashScope
 * Route: POST /api/wan-image
 * Attend: { prompt, model, size, n }
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const prompt = body.prompt || '';
    const model = body.model || 'wan2.7-image-pro';
    const size = body.size || '2K';
    const n = Math.min(body.n || 1, 4);

    if (!prompt) return new Response(JSON.stringify({ success: false, error: 'Prompt requis.' }), { headers: { 'Content-Type': 'application/json' } });

    const WAN_KEY = env.WAN_KEY || '';
    if (!WAN_KEY) return new Response(JSON.stringify({ success: false, error: 'Cle API non configuree.' }), { headers: { 'Content-Type': 'application/json' } });

    var payload = {
      model: model,
      input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
      parameters: { size: size, n: n, watermark: false }
    };

    if (model === 'wan2.7-image-pro') payload.parameters.thinking_mode = true;

    console.log('[WAN-IMAGE] Generation:', model, size, 'n:', n);

    var apiResponse = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + WAN_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    var data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error('[WAN-IMAGE] Erreur API:', apiResponse.status, JSON.stringify(data));
      return new Response(JSON.stringify({ success: false, error: data.message || 'Erreur API: ' + apiResponse.status }), { headers: { 'Content-Type': 'application/json' } });
    }

    var images = [];
    var choices = (data.output && data.output.choices) || [];
    for (var i = 0; i < choices.length; i++) {
      var content = (choices[i].message && choices[i].message.content) || [];
      for (var j = 0; j < content.length; j++) {
        if (content[j].image) images.push(content[j].image);
      }
    }

    if (!images.length) {
      console.error('[WAN-IMAGE] Pas d\'images:', JSON.stringify(data));
      return new Response(JSON.stringify({ success: false, error: 'Aucune image generee' }), { headers: { 'Content-Type': 'application/json' } });
    }

    console.log('[WAN-IMAGE] ' + images.length + ' image(s)');
    return new Response(JSON.stringify({ success: true, images: images }), { headers: { 'Content-Type': 'application/json' } });

  } catch(e) {
    console.error('[WAN-IMAGE] Exception:', e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
