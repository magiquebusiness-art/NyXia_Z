/**
 * NYXIA Z — WAN IMAGE via DashScope
 * Route: POST /api/wan-image
 * Attend: { prompt, model, size, n, format }
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const prompt = body.prompt || '';
    const model = body.model || 'wan2.7-image-pro';
    const size = body.size || '2K';
    const n = Math.min(body.n || 1, 4);
    const format = body.format || '1:1';

    if (!prompt) return new Response(JSON.stringify({ success: false, error: 'Prompt requis.' }), { headers: { 'Content-Type': 'application/json' } });

    const WAN_KEY = env.WAN_KEY || '';
    if (!WAN_KEY) return new Response(JSON.stringify({ success: false, error: 'Cle API non configuree.' }), { headers: { 'Content-Type': 'application/json' } });

    // Mapper format + taille en dimensions DashScope
    // Si un format specifique est demande, convertir en pixels
    var actualSize = size;
    if (format && format !== '1:1') {
      var sizeFormatMap = {
        '1:1':  { '1K': '1024*1024', '2K': '2048*2048', '4K': '4096*4096' },
        '4:5':  { '1K': '816*1024',  '2K': '1536*1920', '4K': '3072*3840' },
        '9:16': { '1K': '576*1024',  '2K': '1080*1920', '4K': '2160*3840' },
        '16:9': { '1K': '1024*576',  '2K': '1920*1080', '4K': '3840*2160' }
      };
      var fmtMap = sizeFormatMap[format];
      if (fmtMap && fmtMap[size]) {
        actualSize = fmtMap[size];
      }
    }

    var payload = {
      model: model,
      input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
      parameters: { size: actualSize, n: n, watermark: false }
    };

    if (model === 'wan2.7-image-pro') payload.parameters.thinking_mode = true;

    console.log('[WAN-IMAGE] Generation:', model, 'size:', actualSize, 'format:', format, 'n:', n);

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
