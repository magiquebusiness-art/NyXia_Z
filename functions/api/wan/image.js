/**
 * NYXIA Z — WAN AI IMAGE GENERATION via DashScope
 * Generation d'image synchrone (pas de polling)
 * Endpoint: POST https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
 * PAS de X-DashScope-Async (synchrone)
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const prompt = body.prompt || '';
    const model = body.model || 'wan2.7-image-pro';
    const size = body.size || '2K';
    const n = body.n || 1;

    if (!prompt) return new Response(JSON.stringify({ success: false, error: 'Prompt requis.' }), { headers: { 'Content-Type': 'application/json' } });

    const DASHSCOPE_KEY = env.DASHSCOPE_KEY || '';
    if (!DASHSCOPE_KEY) return new Response(JSON.stringify({ success: false, error: 'DASHSCOPE_KEY non configuree.' }), { headers: { 'Content-Type': 'application/json' } });

    // Payload DashScope pour image
    var payload = {
      model: model,
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { text: prompt }
            ]
          }
        ]
      },
      parameters: {
        size: size,
        n: Math.min(n, 4),
        watermark: false
      }
    };

    console.log('[WAN-IMAGE] Generation:', model, size, 'n:', n);

    var apiResponse = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + DASHSCOPE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    var data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error('[WAN-IMAGE] Erreur API:', apiResponse.status, JSON.stringify(data));
      return new Response(JSON.stringify({ success: false, error: 'Erreur API DashScope: ' + apiResponse.status + (data.message ? ' - ' + data.message : '') }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Extraire les images de la reponse DashScope
    var images = [];
    var output = data.output || {};
    var results = output.results || [];

    if (results.length > 0) {
      images = results.map(function(item) {
        if (item.url) return item.url;
        if (item.b64_image) return 'data:image/png;base64,' + item.b64_image;
        return '';
      }).filter(function(url) { return url; });
    }

    console.log('[WAN-IMAGE] ' + images.length + ' image(s) generee(s)');

    return new Response(JSON.stringify({ success: true, images: images }), { headers: { 'Content-Type': 'application/json' } });

  } catch(e) {
    console.error('[WAN-IMAGE] Exception:', e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
