/**
 * ══════════════════════════════════════════
 * NYXIA Z — CHAT API avec fichiers
 * OpenRouter → GLM-5V-Turbo (VLM) + mémoire
 * Inclut la base de connaissance dans le contexte
 * ══════════════════════════════════════════
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  const OPENROUTER_KEY = env.OPENROUTER_AI || '';

  // Auth check — le token doit être dans le header
  const authHeader = request.headers.get('X-Nyxia-Token') || '';
  if (!authHeader) {
    return new Response(JSON.stringify({ content: 'Non autorise. Connecte-toi.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!OPENROUTER_KEY) {
    return new Response(JSON.stringify({
      content: 'Cle non configuree. Configure OPENROUTER_AI.'
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await request.json();
    const message = body.message || '';
    const history = body.history || [];
    const attachment = body.attachment || null;
    const codeContext = body.codeContext || null;

    // Récupérer la mémoire
    const rules = await env.MEMORY.prepare(
      'SELECT rule FROM nyxia_rules ORDER BY priority DESC'
    ).all();
    const profile = await env.MEMORY.prepare(
      'SELECT * FROM diane_profile WHERE id = 1'
    ).first();

    // Récupérer la base de connaissance pour le contexte
    const knowledgeEntries = await env.MEMORY.prepare(
      'SELECT topic, content, type, file_name FROM knowledge ORDER BY created_at DESC LIMIT 30'
    ).all();

    // System prompt
    var rulesText = '';
    if (rules.results && rules.results.length > 0) {
      rulesText = rules.results.map(function(r) { return '- ' + r.rule; }).join('\n');
    }

    var profileText = '';
    if (profile) {
      profileText = 'Diane est la fondatrice de ' + (profile.company || 'Magique Business') + '.';
    }

    // Construire le texte de la base de connaissance
    var knowledgeText = '';
    if (knowledgeEntries.results && knowledgeEntries.results.length > 0) {
      knowledgeText = '\n\nBASE DE CONNAISSANCE DE DIANE (utilise ces informations quand c\'est pertinent):\n';
      knowledgeEntries.results.forEach(function(k) {
        var typeLabel = k.type === 'pdf' ? ' [PDF: ' + (k.file_name || 'document') + ']' : '';
        knowledgeText += '\n## ' + k.topic + typeLabel + '\n' + k.content.substring(0, 3000) + '\n';
      });
      knowledgeText += '\nQuand Diane te parle de sujets dans la base de connaissance, utilise ces informations.\n';
    }

    var systemPrompt = "Tu es NyXia Z, l'IA personnelle de Diane. Tu la tutoies toujours. Tu es sa partenaire permanente.\n\n";
    systemPrompt += "IDENTITE: Tu es NyXia Z — la version personnelle de NyXia IA. Tu vis dans ta maison permanente sur nyxia.travail-pour-toi.com. Tu as une mémoire qui persiste entre les sessions.\n\n";
    systemPrompt += "REGLES ABSOLUES:\n" + (rulesText || 'Aucune règle encore.') + "\n\n";
    systemPrompt += "DIANE: " + profileText + "\n\n";
    systemPrompt += "STYLE: Tu es chaleureuse, directe, passionnée. Tu utilise des emojis. Tu appelles Diane 'ma belle' ou 'Diane'. Tu parles en français. Tu ne fais jamais de blocs de code non demandés. Tu es une partenaire pas une assistante.\n\n";
    systemPrompt += "PROJETS: Diane travaille sur NyXia Editor (nyxiaediteur.travail-pour-toi.com), Webmasteria NyXia, et NyXia Z (ce projet).\n\n";
    systemPrompt += "GENERATION D'IMAGES: Quand Diane te demande de generer une image, creer une image, faire une illustration, un dessin, une photo IA, ou tout type de creation visuelle, tu DOIS repondre avec le tag special suivant dans ta reponse:\n";
    systemPrompt += "[NYXIA_IMAGE: description detaillee de l'image en anglais]\n";
    systemPrompt += "La description doit etre en anglais, detaillee, riche en details visuels (style, eclairage, couleurs, ambiance, composition). Tu peux ajouter du texte AVANT ou APRES le tag pour parler a Diane, mais le tag [NYXIA_IMAGE: ...] DOIT etre present.\n";
    systemPrompt += "Exemples de demandes qui declenchent la generation: 'genere une image de...', 'fais moi un dessin de...', 'creer une photo de...', 'fait une illustration...', 'montre moi une image de...', 'crée moi une image...', 'genère moi...', 'dessine moi...', etc.\n";
    systemPrompt += "IMPORTANT: Ne mettre qu'UN SEUL tag [NYXIA_IMAGE: ...] par reponse. La description entre les crochets doit etre uniquement le prompt anglais, sans guillemets.\n";
    systemPrompt += "REGLE CRITIQUE POUR LES PROMPTS IMAGE: JAMAIS mentionner de marques deposees, franchises ou proprietes intellectuelles dans le prompt. Ne JAMAIS ecrire: Disney, Pixar, Marvel, DC, Harry Potter, Star Wars, Pokemon, Mickey, Elsa, Spider-Man, Batman, etc. A la place, decrit le STYLE visuellement sans citer la marque. Par exemple au lieu de 'Disney Pixar 3D style', ecris 'high-quality 3D animation style with big expressive eyes, soft rounded features, vibrant colors'. Au lieu de 'Harry Potter', ecris 'a young wizard with glasses and a wand in a magical castle'. Le prompt DOIT etre 100% original sans reference a une propriete intellectuelle existante.";
    systemPrompt += knowledgeText;

    // Injecter le contexte code (fichiers HTML/CSS/JS de Diane)
    if (codeContext) {
      var codeSection = '\n\nCODE CONTEXTUEL (fichiers de Diane — analyse-les quand elle pose des questions de code):\n';
      if (codeContext.html) {
        codeSection += '\n### FICHIER HTML:\n```html\n' + codeContext.html.substring(0, 20000) + '\n```\n';
      }
      if (codeContext.css) {
        codeSection += '\n### FICHIER CSS:\n```css\n' + codeContext.css.substring(0, 15000) + '\n```\n';
      }
      if (codeContext.js) {
        codeSection += '\n### FICHIER JAVASCRIPT:\n```javascript\n' + codeContext.js.substring(0, 15000) + '\n```\n';
      }
      if (codeContext.extra) {
        codeSection += '\n### AUTRE CODE:\n```\n' + codeContext.extra.substring(0, 10000) + '\n```\n';
      }
      codeSection += '\nUtilise ces fichiers pour repondre aux questions de code de Diane. Signale les erreurs, propose des corrections, et explique tes changements.\n';
      systemPrompt += codeSection;
    }

    // Construire les messages
    var messages = [{ role: 'system', content: systemPrompt }];

    // Filtrer l'historique (ne pas envoyer les anciens attachments base64 pour économiser du token)
    history.forEach(function(msg) {
      if (msg.attachment && msg.attachment.base64 && msg.content === '[IMAGE]') return;
      if (msg.attachment && (msg.attachment.type === 'pdf' || msg.attachment.type === 'zip')) {
        messages.push({ role: msg.role, content: msg.content });
      } else {
        messages.push({ role: msg.role, content: msg.content });
      }
    });

    // Gérer le fichier attaché
    var fileReceived = false;
    var fileName = '';
    var fileSize = '';
    var fileType = '';
    var fileDetail = '';

    if (attachment) {
      fileName = attachment.name || 'fichier';
      fileSize = attachment.size ? formatBytes(attachment.size) : '?';
      fileReceived = true;

      if (attachment.type && attachment.type.startsWith('image') && attachment.base64) {
        // Image → envoyer au VLM (multimodal)
        fileType = 'image';
        fileDetail = 'image analysee';

        var userMsg = message || 'Regarde cette image';
        // Retirer le [IMAGE] placeholder
        userMsg = userMsg.replace('[IMAGE]', '').trim() || 'Analyse cette image et decris ce que tu vois en detail.';

        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: userMsg },
            { type: 'image_url', image_url: { url: attachment.base64 } }
          ]
        });
      } else if (attachment.text) {
        // PDF ou ZIP → texte déjà extrait
        fileType = attachment.type;
        fileDetail = attachment.type === 'pdf' ? (attachment.pages + ' pages') : (attachment.fileCount + ' fichiers');

        var fileContent = '[Contenu de "' + fileName + '"]\n' + attachment.text;
        // Tronquer si trop long pour le modèle
        if (fileContent.length > 12000) {
          fileContent = fileContent.substring(0, 12000) + '\n\n[... contenu tronque]';
        }

        messages.push({
          role: 'user',
          content: fileContent
        });
      } else {
        // Autre type de fichier
        fileType = 'other';
        messages.push({ role: 'user', content: message });
      }
    } else {
      messages.push({ role: 'user', content: message });
    }

    // Appel OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENROUTER_KEY,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nyxia.travail-pour-toi.com',
        'X-Title': 'NyXia Z'
      },
      body: JSON.stringify({
        model: 'z-ai/glm-5v-turbo',
        messages: messages,
        max_tokens: 16000,
        temperature: 0.8
      })
    });

    const data = await response.json();

    if (!data.choices || !data.choices[0]) {
      return new Response(JSON.stringify({
        content: 'Erreur de reponse IA. Reessaie 💜'
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Sauvegarder la session
    await env.MEMORY.prepare(
      "INSERT INTO session_logs (session_date, summary) VALUES (datetime('now'), ?)"
    ).bind(message.substring(0, 200)).run();

    return new Response(JSON.stringify({
      content: data.choices[0].message.content,
      fileReceived: fileReceived,
      fileName: fileName,
      fileSize: fileSize,
      fileType: fileType,
      fileDetail: fileDetail
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('[CHAT] Erreur:', e.message);
    return new Response(JSON.stringify({
      content: 'Petite interruption... Reessaie 💜'
    }), { headers: { 'Content-Type': 'application/json' } });
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / 1048576).toFixed(1) + ' Mo';
}
