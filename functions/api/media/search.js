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
      var videoSize = body.videoSize || 'hd'; // sd, hd, 4k
      var pexOrient = '';
      if (orientation === 'landscape') pexOrient = '&orientation=landscape';
      else if (orientation === 'portrait') pexOrient = '&orientation=portrait';
      // Map size to Pexels size param
      var pexSize = 'medium';
      if (videoSize === '4k') pexSize = 'large';
      else if (videoSize === 'sd') pexSize = 'small';
      // Search Pexels videos - return 1 most popular
      var res = await fetch('https://api.pexels.com/videos/search?query=' + encodeURIComponent(query) + '&per_page=1&size=' + pexSize + '&sort=popular' + pexOrient, {
        headers: { 'Authorization': PEXELS_KEY }
      });
      if (!res.ok) return new Response(JSON.stringify({ success: false, error: 'Erreur Pexels: ' + res.status }), { headers: { 'Content-Type': 'application/json' } });
      var data = await res.json();
      if (!data.videos || !data.videos.length) return new Response(JSON.stringify({ success: false, error: 'Aucun resultat.' }), { headers: { 'Content-Type': 'application/json' } });
      // Pick the best file matching requested quality/size
      var v = data.videos[0];
      var vFiles = v.video_files || [];
      var bestFile = null;
      // Try to match requested quality
      var targetQualities = videoSize === '4k' ? ['uhd', 'hd'] : (videoSize === 'sd' ? ['sd', 'hd'] : ['hd', 'sd']);
      for (var q of targetQualities) {
        for (var vf of vFiles) {
          if (vf.quality === q) {
            // Also check orientation match
            if (orientation === 'portrait' && vf.height > vf.width) { bestFile = vf; break; }
            else if (orientation === 'landscape' && vf.width >= vf.height) { bestFile = vf; break; }
            else if (!bestFile) { bestFile = vf; } // fallback if no orient match
          }
        }
        if (bestFile) break;
      }
      if (!bestFile && vFiles.length) bestFile = vFiles[0];
      return new Response(JSON.stringify({
        success: true,
        video: {
          videoUrl: bestFile ? bestFile.link : '',
          thumbnail: v.image,
          width: bestFile ? bestFile.width : v.width,
          height: bestFile ? bestFile.height : v.height,
          duration: v.duration,
          photographer: v.user && v.user.name ? v.user.name : '',
          pexelsUrl: v.url || '',
          quality: bestFile ? bestFile.quality : '',
          fileSize: bestFile && bestFile.size ? Math.round(bestFile.size / 1048576) + ' MB' : ''
        },
        totalResults: data.total_results || 0,
        orientation: orientation,
        videoSize: videoSize
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
