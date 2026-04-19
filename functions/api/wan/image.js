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
    const n = Math.min(body.n || 1, 4);

    if (!prompt) return new Response(JSON.stringify({ success: false, error: 'Prompt requis.' }), { headers: { 'Content-Type': 'application/json' } });

    const DASHSCOPE_KEY = env.DASHSCOPE_KEY || '';
    if (!DASHSCOPE_KEY) return new Response(JSON.stringify({ success: false, error: 'Cle API non configuree.' }), { headers: { 'Content-Type': 'application/json' } });

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
        n: n,
        watermark: false
      }
    };

    // Thinking mode pour le modele Pro
    if (model === 'wan2.7-image-pro') {
      payload.parameters.thinking_mode = true;
    }

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
      return new Response(JSON.stringify({ success: false, error: data.message || 'Erreur API DashScope: ' + apiResponse.status }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Extraire les images de la reponse DashScope
    // Format correct: output.choices[].message.content[].image
    var images = [];
    var choices = (data.output && data.output.choices) || [];
    for (var i = 0; i < choices.length; i++) {
      var content = (choices[i].message && choices[i].message.content) || [];
      for (var j = 0; j < content.length; j++) {
        if (content[j].image) {
          images.push(content[j].image);
        }
      }
    }

    if (!images.length) {
      console.error('[WAN-IMAGE] Pas d\'images:', JSON.stringify(data));
      return new Response(JSON.stringify({ success: false, error: 'Aucune image generee - essaie un autre prompt' }), { headers: { 'Content-Type': 'application/json' } });
    }

    console.log('[WAN-IMAGE] ' + images.length + ' image(s) generee(s)');

    return new Response(JSON.stringify({ success: true, images: images }), { headers: { 'Content-Type': 'application/json' } });

  } catch(e) {
    console.error('[WAN-IMAGE] Exception:', e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
