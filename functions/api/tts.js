/**
 * ══════════════════════════════════════════
 * NYXIA Z — TTS API  (Edge TTS / DeniseNeural)
 * Gratuit, aucune clé API requise.
 * ══════════════════════════════════════════
 */

const VOICE  = 'fr-FR-DeniseNeural';
const RATE   = '+20%';
const PITCH  = '+0Hz';
const VOLUME = '+0%';
const WS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=';

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    let text = (body.text || '').trim();

    if (!text) {
      return new Response(JSON.stringify({ error: 'Texte manquant' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (text.length > 5000) text = text.substring(0, 5000);

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

    const audioBuffer = await synthesizeEdgeTTS(text);

    if (!audioBuffer || audioBuffer.length === 0) {
      return new Response(JSON.stringify({ error: 'Erreur de synthese vocale' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'public, max-age=86400'
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Erreur serveur TTS: ' + e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}


async function synthesizeEdgeTTS(text) {
  const connectionId = generateUUID();
  const url = WS_URL + connectionId;

  return new Promise((resolve, reject) => {
    let audioChunks = [];
    let timeoutId;
    let resolved = false;

    timeoutId = setTimeout(() => {
      reject(new Error('Timeout TTS (15s)'));
    }, 15000);

    fetch(url, {
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }).then(response => {
      const ws = response.webSocket;
      if (!ws) {
        clearTimeout(timeoutId);
        reject(new Error('WebSocket non disponible'));
        return;
      }

      ws.accept();

      ws.addEventListener('message', (event) => {
        const data = event.data;
        if (typeof data === 'string') {
          if (data.includes('Path:turn.end') || data.includes('Path:turn.start')) {
            if (data.includes('Path:turn.end') && !resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              ws.close();
              resolve(combineChunks(audioChunks));
            }
          }
        } else if (data instanceof ArrayBuffer) {
          if (data.byteLength > 2) {
            audioChunks.push(new Uint8Array(data, 2));
          }
        }
      });

      ws.addEventListener('error', () => {
        clearTimeout(timeoutId);
        if (!resolved) { resolved = true; reject(new Error('Erreur WebSocket TTS')); }
      });

      ws.addEventListener('close', () => {
        clearTimeout(timeoutId);
        if (!resolved) {
          resolved = true;
          resolve(combineChunks(audioChunks));
        }
      });

      // Envoyer la config
      ws.send("Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{\"context\":{\"synthesis\":{\"audio\":{\"metadataoptions\":{\"sentenceBoundaryEnabled\":\"false\",\"wordBoundaryEnabled\":\"true\"},\"outputFormat\":\"audio-24khz-48kbitrate-mono-mp3\"}}}}\r\n");

      // Envoyer le SSML
      const ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='fr-FR'><voice name='" + VOICE + "'><prosody pitch='" + PITCH + "' rate='" + RATE + "' volume='" + VOLUME + "'>" + escapeXml(text) + "</prosody></voice></speak>";
      ws.send("X-RequestId:" + connectionId + "\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n" + ssml + "\r\n");

    }).catch(err => {
      clearTimeout(timeoutId);
      if (!resolved) { resolved = true; reject(err); }
    });
  });
}

function combineChunks(chunks) {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function generateUUID() {
  return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, function () {
    return Math.floor(Math.random() * 16).toString(16);
  });
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
