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
      // Search Pexels videos
      var res = await fetch('https://api.pexels.com/videos/search?query=' + encodeURIComponent(query) + '&per_page=1&size=medium', {
        headers: { 'Authorization': PEXELS_KEY }
      });
      if (!res.ok) return new Response(JSON.stringify({ success: false, error: 'Erreur Pexels: ' + res.status }), { headers: { 'Content-Type': 'application/json' } });
      var data = await res.json();
      if (!data.videos || !data.videos.length) return new Response(JSON.stringify({ success: false, error: 'Aucun resultat.' }), { headers: { 'Content-Type': 'application/json' } });
      var video = data.videos[0];
      return new Response(JSON.stringify({
        success: true,
        videoUrl: video.video_files && video.video_files[0] ? video.video_files[0].link : '',
        previewUrl: video.image,
        thumbnail: video.image,
        width: video.width,
        height: video.height,
        duration: video.duration,
        photographer: video.user && video.user.name ? video.user.name : '',
        pexelsUrl: video.url || ''
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
