/**
 * NYXIA Z — WAN AI IMAGE GENERATION
 * Generates images using WAN model via NVIDIA NIM API
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

    const WAN_KEY = env.WAN_KEY || '';
    if (!WAN_KEY) return new Response(JSON.stringify({ success: false, error: 'WAN_KEY non configuree. Ajoute-la dans les variables Cloudflare.' }), { headers: { 'Content-Type': 'application/json' } });

    // Size mapping
    var sizeMap = { '1K': { width: 1024, height: 1024 }, '2K': { width: 2048, height: 2048 }, '4K': { width: 4096, height: 4096 } };
    var dims = sizeMap[size] || sizeMap['2K'];

    // Call NVIDIA NIM API for WAN image
    var apiResponse = await fetch('https://integrate.api.nvidia.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + WAN_KEY,
        'Content-Type': 'application/json',
        'NVCF-System-Messages': JSON.stringify([{ role: 'system', content: 'Generate a high quality image: ' + prompt }])
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        width: dims.width,
        height: dims.height,
        seed: Math.floor(Math.random() * 1000000),
        n: Math.min(n, 4)
      })
    });

    if (!apiResponse.ok) {
      var errText = await apiResponse.text();
      console.error('[WAN-IMAGE] API Error:', apiResponse.status, errText);
      return new Response(JSON.stringify({ success: false, error: 'Erreur API WAN: ' + apiResponse.status }), { headers: { 'Content-Type': 'application/json' } });
    }

    var data = await apiResponse.json();
    var images = [];
    if (data.data && Array.isArray(data.data)) {
      images = data.data.map(function(item) { return item.url || item.b64_json ? 'data:image/png;base64,' + item.b64_json : ''; }).filter(function(url) { return url; });
    }

    return new Response(JSON.stringify({ success: true, images: images }), { headers: { 'Content-Type': 'application/json' } });
  } catch(e) {
    console.error('[WAN-IMAGE] Error:', e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
