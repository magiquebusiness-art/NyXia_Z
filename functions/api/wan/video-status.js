/**
 * NYXIA Z — WAN VIDEO STATUS POLLING
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const taskId = body.taskId || '';
    if (!taskId) return new Response(JSON.stringify({ success: false, error: 'TaskId requis.' }), { headers: { 'Content-Type': 'application/json' } });

    const task = await env.MEMORY.prepare('SELECT * FROM wan_tasks WHERE task_id = ?').bind(taskId).first();
    if (!task) return new Response(JSON.stringify({ success: false, error: 'Tache non trouvee.' }), { headers: { 'Content-Type': 'application/json' } });

    return new Response(JSON.stringify({
      success: true,
      status: task.status,
      videoUrl: task.video_url || null,
      error: task.status === 'failed' ? 'Echec de la generation' : null
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch(e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
