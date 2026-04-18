/**
 * NYXIA Z — MEDIA SEARCH (Pexels)
 * Searches stock photos and videos via Pexels API
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const query = body.query || '';
    const type = body.type || 'photo';
    const width = body.width || 1200;
    const height = body.height || 800;
    if (!query) return new Response(JSON.stringify({ success: false, error: 'Query requis.' }), { headers: { 'Content-Type': 'application/json' } });

    const PEXELS_KEY = env.PEXELS_KEY || '';
    if (!PEXELS_KEY) return new Response(JSON.stringify({ success: false, error: 'PEXELS_KEY non configuree. Ajoute-la dans les variables Cloudflare.' }), { headers: { 'Content-Type': 'application/json' } });

    if (type === 'video') {
      // Support orientation: landscape (16:9), portrait (9:16), or empty (all)
      var orientation = body.orientation || '';
      var pexOrient = '';
      if (orientation === 'landscape') pexOrient = '&orientation=landscape';
      else if (orientation === 'portrait') pexOrient = '&orientation=portrait';
      // Search Pexels videos - return top 2 most popular
      var res = await fetch('https://api.pexels.com/videos/search?query=' + encodeURIComponent(query) + '&per_page=2&size=medium&sort=popular' + pexOrient, {
        headers: { 'Authorization': PEXELS_KEY }
      });
      if (!res.ok) return new Response(JSON.stringify({ success: false, error: 'Erreur Pexels: ' + res.status }), { headers: { 'Content-Type': 'application/json' } });
      var data = await res.json();
      if (!data.videos || !data.videos.length) return new Response(JSON.stringify({ success: false, error: 'Aucun resultat.' }), { headers: { 'Content-Type': 'application/json' } });
      // Build array of up to 2 videos
      var videos = [];
      for (var vi = 0; vi < Math.min(data.videos.length, 2); vi++) {
        var v = data.videos[vi];
        var vUrl = '';
        var vFiles = v.video_files || [];
        // Pick HD file matching requested orientation when possible
        var bestFile = null;
        if (orientation === 'portrait') {
          for (var vf of vFiles) { if (vf.quality === 'hd' && vf.height > vf.width) { bestFile = vf; break; } }
        } else if (orientation === 'landscape') {
          for (var vf of vFiles) { if (vf.quality === 'hd' && vf.width >= vf.height) { bestFile = vf; break; } }
        }
        if (!bestFile) { for (var vf of vFiles) { if (vf.quality === 'hd') { bestFile = vf; break; } } }
        if (!bestFile && vFiles.length) bestFile = vFiles[0];
        videos.push({
          videoUrl: bestFile ? bestFile.link : '',
          thumbnail: v.image,
          width: v.width,
          height: v.height,
          duration: v.duration,
          photographer: v.user && v.user.name ? v.user.name : '',
          pexelsUrl: v.url || ''
        });
      }
      return new Response(JSON.stringify({
        success: true,
        videos: videos,
        totalResults: data.total_results || 0,
        orientation: orientation
      }), { headers: { 'Content-Type': 'application/json' } });
    } else {
      // Search Pexels photos
      var res = await fetch('https://api.pexels.com/v1/search?query=' + encodeURIComponent(query) + '&per_page=1&orientation=landscape', {
        headers: { 'Authorization': PEXELS_KEY }
      });
      if (!res.ok) return new Response(JSON.stringify({ success: false, error: 'Erreur Pexels: ' + res.status }), { headers: { 'Content-Type': 'application/json' } });
      var data = await res.json();
      if (!data.photos || !data.photos.length) return new Response(JSON.stringify({ success: false, error: 'Aucun resultat.' }), { headers: { 'Content-Type': 'application/json' } });
      var photo = data.photos[0];
      return new Response(JSON.stringify({
        success: true,
        dataUrl: photo.src && photo.src.large2x ? photo.src.large2x : photo.src.original,
        photographer: photo.photographer || '',
        pexelsUrl: photo.photographer_url || photo.url || ''
      }), { headers: { 'Content-Type': 'application/json' } });
    }
  } catch(e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
