/**
 * NYXIA Z — WAN VIDEO STATUS POLLING via DashScope
 * Poll le statut d'une tache video via l'endpoint DashScope
 * Endpoint: GET https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id}
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const taskId = body.taskId || '';
    if (!taskId) return new Response(JSON.stringify({ success: false, error: 'TaskId requis.' }), { headers: { 'Content-Type': 'application/json' } });

    const WAN_KEY = env.WAN_KEY || '';
    if (!WAN_KEY) return new Response(JSON.stringify({ success: false, error: 'Cle API non configuree.' }), { headers: { 'Content-Type': 'application/json' } });

    // Appel DashScope polling
    var apiResponse = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/tasks/' + taskId, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + WAN_KEY
      }
    });

    var data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error('[WAN-VIDEO-STATUS] Erreur API:', apiResponse.status, JSON.stringify(data));
      return new Response(JSON.stringify({ success: false, error: 'Erreur API DashScope: ' + apiResponse.status }), { headers: { 'Content-Type': 'application/json' } });
    }

    var output = data.output || {};
    var taskStatus = output.task_status || 'UNKNOWN';
    var videoUrl = null;

    // Si la video est terminee, extraire l'URL
    if (taskStatus === 'SUCCEEDED' && output.video_url) {
      videoUrl = output.video_url;
    } else if (taskStatus === 'SUCCEEDED' && output.results && output.results.length > 0) {
      videoUrl = output.results[0].video_url || output.results[0].url || null;
    }

    console.log('[WAN-VIDEO-STATUS] Task:', taskId, 'Status:', taskStatus, 'VideoUrl:', videoUrl ? 'oui' : 'non');

    return new Response(JSON.stringify({
      success: true,
      status: taskStatus,
      videoUrl: videoUrl,
      error: taskStatus === 'FAILED' ? (output.message || output.code || 'Echec de la generation') : null
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch(e) {
    console.error('[WAN-VIDEO-STATUS] Exception:', e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
