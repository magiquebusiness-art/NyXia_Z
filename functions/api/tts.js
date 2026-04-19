/**
 * NYXIA Z — TTS API (Amazon Polly via StreamElements)
 * Gratuit, aucune clé API, voix française Céline
 */

const VOICE = 'Celine'; // Voix française féminine (Amazon Polly)

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    let text = (body.text || '').trim();

    if (!text) {
      return new Response(JSON.stringify({ error: 'Texte manquant' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (text.length > 3000) text = text.substring(0, 3000);

    text = text
      .replace(/\*\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/[•\-\*]\s/g, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, '. ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const ttsUrl = 'https://api.streamelements.com/kappa/v2/speech?voice=' + VOICE + '&text=' + encodeURIComponent(text);

    const response = await fetch(ttsUrl);
    if (!response.ok) throw new Error('StreamElements erreur ' + response.status);

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'public, max-age=86400'
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Erreur TTS: ' + e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
