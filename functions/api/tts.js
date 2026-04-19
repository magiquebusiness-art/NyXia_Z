/**
 * ══════════════════════════════════════════
 * NYXIA Z — TTS API  (Edge TTS / DeniseNeural)
 * Gratuit, aucune clé API requise.
 * Utilise le protocole WebSocket de Microsoft Edge.
 * ══════════════════════════════════════════
 */

// Configuration
const VOICE = 'fr-FR-DeniseNeural';
const RATE  = '+0%';     // vitesse normale
const PITCH = '+0Hz';    // ton normal
const VOLUME = '+0%';    // volume normal
const WS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=';

export async function onRequestPost(context) {
  try {
    const { request } = context;
    const body = await request.json();
    let text = (body.text || '').trim();

    if (!text) {
      return new Response(JSON.stringify({ error: 'Texte manquant' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Limiter la longueur (Edge TTS ~5000 chars max pratique)
    if (text.length > 5000) {
      text = text.substring(0, 5000);
    }

    // Nettoyer le texte pour le TTS
    text = text
      .replace(/\*\*/g, '')           // enlever le markdown bold
      .replace(/#{1,6}\s/g, '')       // enlever les titres markdown
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // enlever les liens markdown
      .replace(/```[\s\S]*?```/g, '') // enlever les blocs de code
      .replace(/`([^`]*)`/g, '$1')    // enlever le code inline
      .replace(/[•\-\*]\s/g, '')      // enlever les puces
      .replace(/\n{2,}/g, '. ')       // doubles sauts de ligne → phrase
      .replace(/\n/g, '. ')           // sauts de ligne → phrase
      .replace(/\s{2,}/g, ' ')        // espaces multiples
      .trim();

    // Générer l'audio via Edge TTS WebSocket
    const audioBuffer = await synthesizeEdgeTTS(text);

    if (!audioBuffer || audioBuffer.length === 0) {
      return new Response(JSON.stringify({ error: 'Erreur de synthese vocale' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Retourner l'audio MP3
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'public, max-age=86400' // cache 24h
      }
    });

  } catch (e) {
    console.error('[TTS] Erreur:', e.message);
    return new Response(JSON.stringify({ error: 'Erreur serveur TTS: ' + e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


/**
 * Synthèse vocale via Edge TTS (WebSocket Microsoft)
 * Compatible Cloudflare Workers (WebSocket natif)
 */
async function synthesizeEdgeTTS(text) {
  const connectionId = generateUUID();
  const url = WS_URL + connectionId;

  return new Promise(async (resolve, reject) => {
    let ws;
    let audioChunks = [];
    let timeoutId;
    let messageCount = 0;
    const MAX_MESSAGES = 200;

    try {
      // Timeout de 15 secondes
      timeoutId = setTimeout(() => {
        if (ws) ws.close();
        reject(new Error('Timeout TTS (15s)'));
      }, 15000);

      // Étape 1 : Configuration du WebSocket
      const configResponse = await fetch(
        'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=' + connectionId,
        {
          method: 'GET',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache',
            'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      // Étape 2 : Ouvrir le WebSocket
      const response = await fetch(url, {
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
          'Upgrade': 'websocket',
          'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'fr-FR,fr;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.status !== 101) {
        reject(new Error('WebSocket non établi (status ' + response.status + ')'));
        return;
      }

      ws = response.webSocket;
      if (!ws) {
        reject(new Error('Pas de WebSocket dans la réponse'));
        return;
      }

      ws.accept();

      // Écouter les messages
      ws.addEventListener('message', (event) => {
        messageCount++;
        if (messageCount > MAX_MESSAGES) return;

        const data = event.data;
        if (typeof data === 'string') {
          // Message texte — vérifier si c'est la fin
          if (data.includes('Path:turn.end')) {
            clearTimeout(timeoutId);
            // Combiner tous les chunks audio
            const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of audioChunks) {
              result.set(chunk, offset);
              offset += chunk.length;
            }
            ws.close();
            resolve(result);
          }
        } else {
          // Message binaire — chunk audio
          // Le header est de 2 bytes: [0, 1] pour audio, [0, 2] pour silence
          if (data instanceof ArrayBuffer) {
            const view = new DataView(data);
            const headerLength = 2;
            if (view.byteLength > headerLength) {
              const audioData = new Uint8Array(data, headerLength);
              // Ignorer les chunks de silence trop petits
              if (audioData.length > 1) {
                audioChunks.push(audioData);
              }
            }
          }
        }
      });

      ws.addEventListener('error', (event) => {
        clearTimeout(timeoutId);
        reject(new Error('Erreur WebSocket TTS'));
      });

      ws.addEventListener('close', () => {
        clearTimeout(timeoutId);
        // Si on arrive ici sans avoir reçu turn.end, résoudre quand même
        if (audioChunks.length > 0) {
          const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const result = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of audioChunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }
          resolve(result);
        }
      });

      // Étape 3 : Envoyer la configuration
      const configMessage = `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`;
      ws.send(configMessage);

      // Étape 4 : Envoyer le SSML
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='fr-FR'>
        <voice name='${VOICE}'>
          <prosody pitch='${PITCH}' rate='${RATE}' volume='${VOLUME}'>
            ${escapeXml(text)}
          </prosody>
        </voice>
      </speak>`;

      const ssmlMessage = `X-RequestId:${connectionId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}\r\n`;
      ws.send(ssmlMessage);

    } catch (e) {
      clearTimeout(timeoutId);
      if (ws) {
        try { ws.close(); } catch (_) {}
      }
      reject(e);
    }
  });
}


/** Génère un UUID v4 simple */
function generateUUID() {
  return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, function () {
    return Math.floor(Math.random() * 16).toString(16);
  });
}

/** Échapper les caractères spéciaux XML */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
